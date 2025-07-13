import { NextRequest, NextResponse } from 'next/server';
import { FirestoreService } from '@/lib/firestore';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeAll = searchParams.get('includeAll') === 'true';
    
    const groupedSessions = await FirestoreService.getGroupedSessions(includeAll);
    
    return NextResponse.json(groupedSessions);
  } catch (error) {
    console.error('Failed to fetch grouped sessions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch grouped sessions' },
      { status: 500 }
    );
  }
}
