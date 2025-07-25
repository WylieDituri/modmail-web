import { NextRequest } from 'next/server';
import { FirestoreService } from '@/lib/firestore';
import { verify } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-fallback-secret-change-in-production';

interface JWTPayload {
  discordId: string;
  username: string;
  isModerator: boolean;
  isAdmin: boolean;
}

interface SSEClient {
  id: string;
  controller: ReadableStreamDefaultController;
  isModerator: boolean;
  isAdmin: boolean;
  lastHeartbeat: number;
}

interface UpdateData {
  sessions: unknown;
  groupedSessions: unknown;
  stats: unknown;
  timestamp: number;
}

// Store active SSE connections
const clients = new Map<string, SSEClient>();
let lastDataHash = '';
let lastUpdateTime = 0;

// Clean up inactive clients every 30 seconds
setInterval(() => {
  const now = Date.now();
  const timeout = 60000; // 60 seconds timeout
  
  for (const [clientId, client] of clients.entries()) {
    if (now - client.lastHeartbeat > timeout) {
      try {
        client.controller.close();
      } catch (error) {
        console.error('Error closing SSE client:', error);
      }
      clients.delete(clientId);
      console.log(`Removed inactive SSE client: ${clientId}`);
    }
  }
}, 30000);

// Function to broadcast data to all connected clients
async function broadcastUpdate(data: UpdateData, event = 'update') {
  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  
  for (const [clientId, client] of clients.entries()) {
    try {
      client.controller.enqueue(new TextEncoder().encode(message));
    } catch (error) {
      console.error(`Error sending to client ${clientId}:`, error);
      clients.delete(clientId);
    }
  }
}

// Function to check for updates and broadcast if needed
async function checkAndBroadcastUpdates() {
  try {
    // Get current timestamp from database
    const currentTime = await FirestoreService.getLastUpdated();
    
    if (currentTime > lastUpdateTime) {
      console.log('Data updated, broadcasting to SSE clients...');
      
      // Fetch updated data
      const [sessions, groupedSessions, stats] = await Promise.all([
        FirestoreService.getAllSessions(),
        FirestoreService.getGroupedSessions(),
        FirestoreService.getStats()
      ]);

      const updateData = {
        sessions,
        groupedSessions,
        stats,
        timestamp: currentTime
      };

      // Create a hash to avoid sending duplicate data
      const dataHash = JSON.stringify(updateData).slice(0, 100);
      
      if (dataHash !== lastDataHash) {
        await broadcastUpdate(updateData);
        lastDataHash = dataHash;
      }
      
      lastUpdateTime = currentTime;
    }
  } catch (error) {
    console.error('Error checking for updates:', error);
  }
}

// Poll for updates every 5 seconds when there are active clients (reduced frequency)
setInterval(async () => {
  if (clients.size > 0) {
    await checkAndBroadcastUpdates();
  }
}, 5000);

// Send heartbeat every 15 seconds to keep connections alive (more frequent)
setInterval(() => {
  const heartbeatMessage = `event: heartbeat\ndata: ${JSON.stringify({ timestamp: Date.now() })}\n\n`;
  
  for (const [clientId, client] of clients.entries()) {
    try {
      client.controller.enqueue(new TextEncoder().encode(heartbeatMessage));
    } catch (error) {
      console.error(`Error sending heartbeat to client ${clientId}:`, error);
      clients.delete(clientId);
    }
  }
}, 15000);

export async function GET(request: NextRequest) {
  // Verify authentication
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '') || 
                request.nextUrl.searchParams.get('token') ||
                request.cookies.get('auth-token')?.value;

  if (!token) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const decoded = verify(token, JWT_SECRET) as JWTPayload;
    
    // Only allow moderators and admins
    if (!decoded.isModerator && !decoded.isAdmin) {
      return new Response('Forbidden', { status: 403 });
    }

    const clientId = `${decoded.discordId}-${Date.now()}`;
    
    const stream = new ReadableStream({
      async start(controller) {
        // Add client to our tracking
        clients.set(clientId, {
          id: clientId,
          controller,
          isModerator: decoded.isModerator,
          isAdmin: decoded.isAdmin,
          lastHeartbeat: Date.now()
        });

        console.log(`SSE client connected: ${clientId} (${decoded.username})`);

        // Send initial connection message
        const connectMessage = `event: connected\ndata: ${JSON.stringify({ 
          clientId, 
          timestamp: Date.now(),
          message: 'Connected to real-time updates'
        })}\n\n`;
        
        controller.enqueue(new TextEncoder().encode(connectMessage));

        // Send initial data immediately - always send current data on connect
        try {
          const [sessions, groupedSessions, stats] = await Promise.all([
            FirestoreService.getAllSessions(),
            FirestoreService.getGroupedSessions(),
            FirestoreService.getStats()
          ]);

          const initialData = {
            sessions,
            groupedSessions,
            stats,
            timestamp: Date.now()
          };

          const initialMessage = `event: update\ndata: ${JSON.stringify(initialData)}\n\n`;
          controller.enqueue(new TextEncoder().encode(initialMessage));
          console.log(`Sent initial data to SSE client: ${clientId}`);
        } catch (error) {
          console.error('Error sending initial data to SSE client:', error);
        }

        // Also check for future updates
        checkAndBroadcastUpdates();
      },
      
      cancel() {
        clients.delete(clientId);
        console.log(`SSE client disconnected: ${clientId}`);
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control',
      },
    });

  } catch (error) {
    console.error('SSE authentication error:', error);
    return new Response('Unauthorized', { status: 401 });
  }
}
