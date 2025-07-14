import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verify } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-fallback-secret-change-in-production';

// Routes that require authentication
const protectedRoutes = ['/moderator', '/dashboard'];

// Routes that require moderator access
const moderatorRoutes = ['/moderator'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Check if this is a protected route
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
  const isModerator = moderatorRoutes.some(route => pathname.startsWith(route));
  
  if (!isProtectedRoute) {
    return NextResponse.next();
  }

  // Get token from cookie
  const token = request.cookies.get('auth-token')?.value;

  if (!token) {
    // Redirect to home page if no token (they can choose to login from there)
    return NextResponse.redirect(new URL('/', request.url));
  }

  try {
    // Verify JWT token
    const decoded = verify(token, JWT_SECRET) as {
      userId: string;
      discordId: string;
      username: string;
      isModerator: boolean;
    };

    // Check moderator access for moderator routes
    if (isModerator && !decoded.isModerator) {
      // Redirect non-moderators to dashboard
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    // Add user info to request headers for the page to use
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', decoded.userId);
    requestHeaders.set('x-discord-id', decoded.discordId);
    requestHeaders.set('x-username', decoded.username);
    requestHeaders.set('x-is-moderator', decoded.isModerator.toString());

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });

  } catch (error) {
    console.error('JWT verification failed:', error);
    // Redirect to home page if token is invalid
    return NextResponse.redirect(new URL('/', request.url));
  }
}

export const config = {
  matcher: ['/moderator/:path*', '/dashboard/:path*'],
};
