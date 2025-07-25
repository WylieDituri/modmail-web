import { NextResponse } from 'next/server';
import { verify } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-fallback-secret-change-in-production';

export async function GET(request: Request) {
  try {
    // Get token from cookie or Authorization header
    const cookieHeader = request.headers.get('cookie');
    const authHeader = request.headers.get('authorization');
    
    let token = null;
    
    if (cookieHeader) {
      const cookies = Object.fromEntries(
        cookieHeader.split('; ').map(c => c.split('='))
      );
      token = cookies['auth-token'];
    } else if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    if (!token) {
      return NextResponse.json(
        { error: 'No authentication token provided' },
        { status: 401 }
      );
    }

    // Verify JWT token
    const decoded = verify(token, JWT_SECRET) as {
      userId: string;
      discordId: string;
      username: string;
      isModerator: boolean;
      isAdmin: boolean;
    };

    return NextResponse.json({
      user: {
        userId: decoded.userId,
        discordId: decoded.discordId,
        username: decoded.username,
        isModerator: decoded.isModerator,
        isAdmin: decoded.isAdmin,
      }
    });

  } catch (error) {
    console.error('Auth verification error:', error);
    return NextResponse.json(
      { error: 'Invalid authentication token' },
      { status: 401 }
    );
  }
}
