import { NextRequest, NextResponse } from 'next/server';
import { FirestoreService } from '@/lib/firestore';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

interface JWTPayload {
  discordId: string;
  isModerator: boolean;
  isAdmin: boolean;
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    
    // Verify authentication using cookies instead of Bearer token
    const cookieHeader = request.headers.get('cookie');
    let token = null;
    
    if (cookieHeader) {
      const cookies = Object.fromEntries(
        cookieHeader.split('; ').map(c => c.split('='))
      );
      token = cookies['auth-token'];
    }

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized - No auth token' }, { status: 401 });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    
    if (!decoded.isModerator) {
      return NextResponse.json({ error: 'Forbidden - Moderator access required' }, { status: 403 });
    }

    const sessionId = params.id;
    const { pin } = await request.json();

    console.log('Pin API called for session:', sessionId, 'pin status:', pin, 'by user:', decoded.discordId);

    // Get the current session
    const session = await FirestoreService.getSessionById(sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Update pin status
    const updateData: Partial<{
      isPinned: boolean;
      pinnedBy: string | null;
      pinnedAt: Date | null;
      updatedAt: Date;
    }> = {
      isPinned: pin,
      updatedAt: new Date()
    };

    if (pin) {
      updateData.pinnedBy = decoded.discordId;
      updateData.pinnedAt = new Date();
    } else {
      updateData.pinnedBy = null;
      updateData.pinnedAt = null;
    }

    await FirestoreService.updateSession(sessionId, updateData);

    console.log('Session pin status updated successfully:', sessionId, 'isPinned:', pin);

    // Note: Real-time updates will be handled by polling in production
    // Socket.IO events removed for deployment compatibility

    return NextResponse.json({ 
      success: true, 
      message: pin ? 'Session pinned successfully' : 'Session unpinned successfully' 
    });

  } catch (error) {
    console.error('Error toggling session pin:', error);
    return NextResponse.json(
      { error: 'Failed to toggle session pin' },
      { status: 500 }
    );
  }
}
