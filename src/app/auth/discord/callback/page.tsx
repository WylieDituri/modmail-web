'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { MessageSquare, Loader2 } from 'lucide-react';

export default function DiscordCallback() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const handleDiscordCallback = async () => {
      try {
        const code = searchParams.get('code');
        const error = searchParams.get('error');

        if (error) {
          throw new Error(`Discord OAuth error: ${error}`);
        }

        if (!code) {
          throw new Error('No authorization code received from Discord');
        }

        // Exchange code for access token
        const tokenResponse = await fetch('/api/auth/discord/callback', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code }),
        });

        if (!tokenResponse.ok) {
          throw new Error('Failed to exchange code for token');
        }

        const userData = await tokenResponse.json();
        
        // Store user data in localStorage
        localStorage.setItem('discord_user', JSON.stringify(userData));
        
        setStatus('success');
        
        // Redirect to dashboard after a short delay
        setTimeout(() => {
          router.push(`/dashboard?discordId=${userData.id}`);
        }, 1500);

      } catch (error) {
        console.error('Discord OAuth error:', error);
        setError(error instanceof Error ? error.message : 'Unknown error');
        setStatus('error');
      }
    };

    handleDiscordCallback();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-lg p-12 text-center max-w-md">
        <div className="flex justify-center mb-6">
          <div className="bg-blue-100 p-4 rounded-full">
            {status === 'loading' ? (
              <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
            ) : (
              <MessageSquare className="h-12 w-12 text-blue-600" />
            )}
          </div>
        </div>
        
        {status === 'loading' && (
          <>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Connecting to Discord
            </h1>
            <p className="text-gray-600">
              Please wait while we authenticate your account...
            </p>
          </>
        )}
        
        {status === 'success' && (
          <>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Successfully Connected!
            </h1>
            <p className="text-gray-600">
              Redirecting to your dashboard...
            </p>
          </>
        )}
        
        {status === 'error' && (
          <>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Authentication Failed
            </h1>
            <p className="text-red-600 mb-4">
              {error}
            </p>
            <button
              onClick={() => router.push('/')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go Back Home
            </button>
          </>
        )}
      </div>
    </div>
  );
}
