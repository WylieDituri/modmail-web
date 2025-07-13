import { NextResponse } from 'next/server';
import { FirestoreService } from '@/lib/firestore';

export async function GET() {
  try {
    const lastUpdated = await FirestoreService.getLastUpdated();
    return NextResponse.json({ lastUpdated });
  } catch (error) {
    console.error('Failed to get last updated timestamp:', error);
    return NextResponse.json(
      { error: 'Failed to get last updated timestamp' },
      { status: 500 }
    );
  }
}
