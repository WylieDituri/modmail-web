import { NextRequest, NextResponse } from 'next/server';
import { FirestoreService } from '@/lib/firestore';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { satisfactionRating } = await request.json();
    
    if (!satisfactionRating || !['thumbs_up', 'thumbs_down'].includes(satisfactionRating)) {
      return NextResponse.json(
        { error: 'Valid satisfaction rating is required (thumbs_up or thumbs_down)' },
        { status: 400 }
      );
    }

    const updatedSession = await FirestoreService.updateSession(id, { satisfactionRating });
    
    if (!updatedSession) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedSession);
  } catch (error) {
    console.error('Failed to update session satisfaction:', error);
    return NextResponse.json(
      { error: 'Failed to update session satisfaction' },
      { status: 500 }
    );
  }
}
