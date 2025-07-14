import { NextResponse } from 'next/server';

const DISCORD_CLIENT_ID = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID;
const DISCORD_REDIRECT_URI = process.env.DISCORD_REDIRECT_URI || 'http://localhost:3000/auth/discord/callback';

export async function GET() {
  try {
    if (!DISCORD_CLIENT_ID) {
      return NextResponse.json(
        { error: 'Discord OAuth not configured' },
        { status: 500 }
      );
    }

    // Generate Discord OAuth URL
    const params = new URLSearchParams({
      client_id: DISCORD_CLIENT_ID,
      redirect_uri: DISCORD_REDIRECT_URI,
      response_type: 'code',
      scope: 'identify',
    });

    const discordAuthUrl = `https://discord.com/api/oauth2/authorize?${params.toString()}`;

    return NextResponse.json({ authUrl: discordAuthUrl });
  } catch (error) {
    console.error('Login route error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
