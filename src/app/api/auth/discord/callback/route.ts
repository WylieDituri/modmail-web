import { NextRequest, NextResponse } from 'next/server';
import { FirestoreService } from '@/lib/firestore';
import { sign } from 'jsonwebtoken';

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const DISCORD_REDIRECT_URI = process.env.DISCORD_REDIRECT_URI || 'http://localhost:3000/auth/discord/callback';
const JWT_SECRET = process.env.JWT_SECRET || 'your-fallback-secret-change-in-production';
const ADMINS = process.env.ADMINS?.split(',') || [];

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();

    console.log('=== Discord OAuth Debug ===');
    console.log('DISCORD_CLIENT_ID:', DISCORD_CLIENT_ID ? 'Set' : 'Missing');
    console.log('DISCORD_CLIENT_SECRET:', DISCORD_CLIENT_SECRET ? 'Set' : 'Missing');
    console.log('DISCORD_REDIRECT_URI:', DISCORD_REDIRECT_URI);
    console.log('Code received:', code ? 'Yes' : 'No');

    if (!code) {
      return NextResponse.json(
        { error: 'Authorization code is required' },
        { status: 400 }
      );
    }

    if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET) {
      console.error('Discord OAuth not configured properly');
      console.error('CLIENT_ID exists:', !!DISCORD_CLIENT_ID);
      console.error('CLIENT_SECRET exists:', !!DISCORD_CLIENT_SECRET);
      return NextResponse.json(
        { error: 'Discord OAuth not configured' },
        { status: 500 }
      );
    }

    // Exchange authorization code for access token
    console.log('Attempting token exchange with Discord...');
    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: DISCORD_REDIRECT_URI,
      }),
    });

    console.log('Token response status:', tokenResponse.status);

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Token exchange failed:', {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        error: errorData
      });
      
      return NextResponse.json(
        { 
          error: 'Failed to exchange code for token',
          details: errorData,
          status: tokenResponse.status
        },
        { status: 400 }
      );
    }

    const tokenData = await tokenResponse.json();

    // Get user information from Discord
    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    if (!userResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch user data' },
        { status: 400 }
      );
    }

    const userData = await userResponse.json();

    // Check if user is a moderator and admin using Firestore
    const isModerator = await FirestoreService.isModerator(userData.id);
    const isAdmin = ADMINS.includes(userData.id);

    try {
      // Create or update user in Firestore
      const user = await FirestoreService.createUser({
        discordId: userData.id,
        username: userData.username,
        avatar: userData.avatar ? `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.png` : undefined,
        isModerator
      });

      // Create JWT token
      const token = sign(
        {
          userId: user.id,
          discordId: userData.id,
          username: userData.username,
          isModerator,
          isAdmin,
        },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      // Create response with secure cookie
      const response = NextResponse.json({
        user: {
          id: user.id,
          discordId: userData.id,
          username: userData.username,
          avatar: user.avatar,
          isModerator,
          isAdmin,
        },
        token,
      });

      // Set secure HTTP-only cookie
      response.cookies.set('auth-token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60, // 7 days
        path: '/',
      });

      return response;

    } catch (dbError) {
      console.error('Database error during OAuth:', dbError);
      return NextResponse.json(
        { error: 'Failed to save user data' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Discord OAuth error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
