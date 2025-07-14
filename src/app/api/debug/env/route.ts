import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID ? 'Set' : 'Missing',
    DISCORD_CLIENT_SECRET: process.env.DISCORD_CLIENT_SECRET ? 'Set' : 'Missing',
    DISCORD_REDIRECT_URI: process.env.DISCORD_REDIRECT_URI,
    JWT_SECRET: process.env.JWT_SECRET ? 'Set' : 'Missing',
    OWNERS: process.env.OWNERS,
    // Show actual values for debugging (remove in production)
    actualClientId: process.env.DISCORD_CLIENT_ID,
    actualRedirectUri: process.env.DISCORD_REDIRECT_URI,
  });
}
