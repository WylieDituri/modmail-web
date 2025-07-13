import { NextRequest, NextResponse } from 'next/server';
import { FirestoreService } from '@/lib/firestore';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeAll = searchParams.get('includeAll') === 'true';
    
    const sessions = await FirestoreService.getAllSessions();
    
    if (includeAll) {
      return NextResponse.json(sessions);
    }
    
    // Filter out closed sessions for default view
    const activeSessions = sessions.filter(session => session.status !== 'closed');
    return NextResponse.json(activeSessions);
  } catch (error) {
    console.error('Failed to fetch sessions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sessions' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, assignedModerator } = await request.json();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Check if user exists before creating session
    const user = await FirestoreService.getUserById(userId);
    if (!user) {
      console.error('User not found during session creation:', userId);
      
      // Debug: List all users
      const allUsers = await FirestoreService.getAllUsers();
      console.log('All users in Firestore:', allUsers.map(u => ({ id: u.id, username: u.username })));
      
      return NextResponse.json(
        { error: 'User not found. Please ensure the user is created before creating a session.' },
        { status: 400 }
      );
    }

    console.log('Found user for session creation:', user.id);
    const session = await FirestoreService.createSession({
      userId,
      assignedModerator,
    });

    console.log('Created session:', session.id);
    return NextResponse.json(session);
  } catch (error) {
    console.error('Failed to create session:', error);
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    );
  }
}
