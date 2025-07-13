import { NextResponse } from 'next/server';
import { FirestoreService } from '@/lib/firestore';

export async function GET() {
  try {
    // For now, we'll only implement global stats
    // Individual moderator stats can be added later if needed
    const stats = await FirestoreService.getStats();
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Failed to fetch stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
