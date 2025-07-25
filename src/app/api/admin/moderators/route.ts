import { NextRequest, NextResponse } from 'next/server';
import { verify } from 'jsonwebtoken';
import { FirestoreService } from '@/lib/firestore';

const JWT_SECRET = process.env.JWT_SECRET || 'your-fallback-secret-change-in-production';
const ADMINS = process.env.ADMINS?.split(',') || [];

export async function GET(request: NextRequest) {
  try {
    // Get token from cookie
    const cookieHeader = request.headers.get('cookie');
    let token = null;
    
    if (cookieHeader) {
      const cookies = Object.fromEntries(
        cookieHeader.split('; ').map(c => c.split('='))
      );
      token = cookies['auth-token'];
    }

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify JWT token and check admin status
    const decoded = verify(token, JWT_SECRET) as {
      userId: string;
      discordId: string;
      username: string;
      isModerator: boolean;
      isAdmin?: boolean;
    };

    // Double-check admin status
    if (!decoded.isAdmin && !ADMINS.includes(decoded.discordId)) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Return current moderators list from Firestore
    const moderators = await FirestoreService.getModeratorsConfig();
    
    return NextResponse.json({ moderators });

  } catch (error) {
    console.error('Get moderators error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch moderators' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get token from cookie
    const cookieHeader = request.headers.get('cookie');
    let token = null;
    
    if (cookieHeader) {
      const cookies = Object.fromEntries(
        cookieHeader.split('; ').map(c => c.split('='))
      );
      token = cookies['auth-token'];
    }

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify JWT token and check admin status
    const decoded = verify(token, JWT_SECRET) as {
      userId: string;
      discordId: string;
      username: string;
      isModerator: boolean;
      isAdmin?: boolean;
    };

    // Double-check admin status
    if (!decoded.isAdmin && !ADMINS.includes(decoded.discordId)) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { action, discordId } = await request.json();

    if (!action || !discordId) {
      return NextResponse.json(
        { error: 'Action and discordId are required' },
        { status: 400 }
      );
    }

    // Prevent removing admin users from moderators
    if (action === 'remove' && ADMINS.includes(discordId)) {
      return NextResponse.json(
        { error: 'Cannot remove admin users from moderators list' },
        { status: 400 }
      );
    }

    let updatedModerators: string[];

    if (action === 'add') {
      updatedModerators = await FirestoreService.addModerator(discordId);
      return NextResponse.json({
        message: `Successfully added moderator ${discordId}`,
        moderators: updatedModerators,
      });
    } else if (action === 'remove') {
      updatedModerators = await FirestoreService.removeModerator(discordId);
      return NextResponse.json({
        message: `Successfully removed moderator ${discordId}`,
        moderators: updatedModerators,
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "add" or "remove"' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Manage moderators error:', error);
    return NextResponse.json(
      { error: 'Failed to manage moderators' },
      { status: 500 }
    );
  }
}
