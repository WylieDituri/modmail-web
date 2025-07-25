import { NextRequest, NextResponse } from 'next/server';
import { FirestoreService } from '../../../../../lib/firestore';

// Trigger SSE update
async function broadcastUpdate() {
  try {
    await FirestoreService.updateLastUpdated();
  } catch (error) {
    console.error('Failed to broadcast update:', error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { moderatorId, pin } = await request.json();
    
    if (!moderatorId) {
      return NextResponse.json(
        { error: 'Moderator ID is required' },
        { status: 400 }
      );
    }

    const updates: Record<string, unknown> = {
      assignedModerator: moderatorId,
      status: 'active' as const
    };

    // Handle pinning if specified
    if (pin !== undefined) {
      updates.isPinned = pin;
      updates.pinnedBy = pin ? moderatorId : null;
      updates.pinnedAt = pin ? new Date().toISOString() : null;
    }

    const session = await FirestoreService.updateSession(id, updates);
    
    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Trigger SSE update
    await broadcastUpdate();

    return NextResponse.json(session);
  } catch (error) {
    console.error('Failed to claim session:', error);
    return NextResponse.json(
      { error: 'Failed to claim session' },
      { status: 500 }
    );
  }
}