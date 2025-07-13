import { NextRequest, NextResponse } from 'next/server';
import { FirestoreService } from '@/lib/firestore';

export async function GET() {
  try {
    const users = await FirestoreService.getAllUsers();
    // Filter to get moderators if needed
    const moderators = users.filter(user => user.isModerator);
    return NextResponse.json(moderators);
  } catch (error) {
    console.error('Failed to fetch users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { discordId, username, avatar, isModerator } = await request.json();
    
    if (!discordId || !username) {
      return NextResponse.json(
        { error: 'Discord ID and username are required' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await FirestoreService.getUserByDiscordId(discordId);
    if (existingUser) {
      console.log('Returning existing user:', existingUser.id);
      return NextResponse.json(existingUser);
    }

    const user = await FirestoreService.createUser({
      discordId,
      username,
      avatar,
      isModerator,
    });

    console.log('Created new user:', user.id);
    return NextResponse.json(user);
  } catch (error) {
    console.error('Failed to create user:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}
