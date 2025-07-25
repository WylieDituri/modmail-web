import { NextRequest, NextResponse } from 'next/server';
import { FirestoreService } from '@/lib/firestore';

// Import the broadcast function from SSE route
async function broadcastUpdate() {
  try {
    // Trigger update by updating the lastUpdated timestamp
    await FirestoreService.updateLastUpdated();
  } catch (error) {
    console.error('Failed to broadcast update:', error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { content, authorId, authorName, sessionId, isAnonymous } = await request.json();
    
    if (!content || !authorId || !sessionId) {
      return NextResponse.json(
        { error: 'Content, author ID, and session ID are required' },
        { status: 400 }
      );
    }

    const message = await FirestoreService.createMessage({
      content,
      authorId,
      authorName,
      sessionId,
      isAnonymous,
    });

    // Trigger SSE update
    await broadcastUpdate();

    return NextResponse.json(message);
  } catch (error) {
    console.error('Failed to create message:', error);
    return NextResponse.json(
      { error: 'Failed to create message' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    const messages = await FirestoreService.getMessagesBySessionId(sessionId);
    return NextResponse.json(messages);
  } catch (error) {
    console.error('Failed to fetch messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}
