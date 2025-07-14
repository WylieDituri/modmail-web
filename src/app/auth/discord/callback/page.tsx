'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { MessageSquare, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

export default function DiscordCallback() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string>('');
  const [userInfo, setUserInfo] = useState<{ username: string; isModerator: boolean } | null>(null);

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

        setStatus('loading');

        // Exchange code for access token and user data
        const response = await fetch('/api/auth/discord/callback', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Authentication failed');
        }

        const { user } = await response.json();
        
        setUserInfo(user);
        setStatus('success');
        
        // Redirect based on user type
        setTimeout(() => {
          if (user.isModerator) {
            router.push('/moderator');
          } else {
            router.push('/dashboard');
          }
        }, 2000);

      } catch (err) {
        console.error('Discord OAuth error:', err);
        setError(err instanceof Error ? err.message : 'Authentication failed');
        setStatus('error');
        
        // Redirect to login after error
        setTimeout(() => {
          router.push('/');
        }, 3000);
      }
    };

    handleDiscordCallback();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center">
          <MessageSquare className="h-12 w-12 text-blue-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Discord Authentication
          </h1>

          {status === 'loading' && (
            <div className="space-y-4">
              <Loader2 className="h-8 w-8 text-blue-600 mx-auto animate-spin" />
              <p className="text-gray-600">Authenticating with Discord...</p>
            </div>
          )}

          {status === 'success' && userInfo && (
            <div className="space-y-4">
              <CheckCircle className="h-8 w-8 text-green-600 mx-auto" />
              <div>
                <p className="text-green-600 font-medium">Authentication successful!</p>
                <p className="text-gray-600 mt-2">
                  Welcome, <span className="font-medium">{userInfo.username}</span>
                </p>
                {userInfo.isModerator && (
                  <p className="text-blue-600 text-sm mt-1">
                    🛡️ Moderator access granted
                  </p>
                )}
              </div>
              <p className="text-sm text-gray-500">
                Redirecting to {userInfo.isModerator ? 'moderator dashboard' : 'user dashboard'}...
              </p>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-4">
              <AlertCircle className="h-8 w-8 text-red-600 mx-auto" />
              <div>
                <p className="text-red-600 font-medium">Authentication failed</p>
                <p className="text-gray-600 text-sm mt-2">{error}</p>
              </div>
              <p className="text-sm text-gray-500">
                Redirecting to login page...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
