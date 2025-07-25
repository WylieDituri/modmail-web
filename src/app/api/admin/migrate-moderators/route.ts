import { NextRequest, NextResponse } from 'next/server';
import { verify } from 'jsonwebtoken';
import { FirestoreService } from '@/lib/firestore';

const JWT_SECRET = process.env.JWT_SECRET || 'your-fallback-secret-change-in-production';
const ADMINS = process.env.ADMINS?.split(',') || [];
const OWNERS = process.env.OWNERS?.split(',') || [];

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

    // Get current Firestore moderators
    const firestoreModerators = await FirestoreService.getModeratorsConfig();
    
    // Get environment variable moderators
    const envModerators = OWNERS.filter(id => id.trim());
    
    // Combine and deduplicate
    const allModerators = Array.from(new Set([...firestoreModerators, ...envModerators]));
    
    // Update Firestore with the combined list
    await FirestoreService.updateModeratorsConfig(allModerators);
    
    return NextResponse.json({
      message: `Successfully migrated ${envModerators.length} moderators from environment variables to Firestore`,
      beforeMigration: {
        firestore: firestoreModerators,
        environment: envModerators,
      },
      afterMigration: allModerators,
    });

  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json(
      { error: 'Failed to migrate moderators' },
      { status: 500 }
    );
  }
}
