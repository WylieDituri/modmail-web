import { NextRequest, NextResponse } from 'next/server';

// Approved moderators - in production, this would be stored in a database
const APPROVED_MODERATORS = [
  {
    id: 'mod-1',
    username: 'mod',
    password: 'mod123', // In production, this would be hashed
    discordId: 'mod1',
    isModerator: true
  },
  // Add more moderators here as needed
];

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    // Find the moderator in the approved list
    const moderator = APPROVED_MODERATORS.find(
      mod => mod.username === username && mod.password === password
    );

    if (!moderator) {
      return NextResponse.json(
        { error: 'Invalid credentials or unauthorized access' },
        { status: 401 }
      );
    }

    // Don't return the password in the response
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...moderatorData } = moderator;

    return NextResponse.json({
      ...moderatorData,
      message: 'Login successful'
    });

  } catch (error) {
    console.error('Moderator login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
