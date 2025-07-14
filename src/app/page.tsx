'use client';

import { MessageSquare, User, Users } from "lucide-react";
import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function Home() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [discordUserId, setDiscordUserId] = useState<string | null>(null);
  const [showAuthOptions, setShowAuthOptions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Check if Discord user ID is provided in URL parameters
    // Support multiple possible parameter names that Discord might use
    const userId = searchParams.get('userId') || 
                  searchParams.get('user_id') || 
                  searchParams.get('discordId') || 
                  searchParams.get('discord_id') || 
                  searchParams.get('uid') ||
                  searchParams.get('id');
    
    console.log('All URL params:', Object.fromEntries(searchParams.entries()));
    console.log('Extracted Discord User ID:', userId);
    
    if (userId) {
      setDiscordUserId(userId);
      setShowAuthOptions(true);
      return;
    }

    // Check for existing Discord auth in localStorage
    const savedDiscordUser = localStorage.getItem('discord_user');
    if (savedDiscordUser) {
      try {
        const userData = JSON.parse(savedDiscordUser);
        if (userData.id) {
          console.log('Found saved Discord user:', userData);
          setDiscordUserId(userData.id);
          setShowAuthOptions(true);
        }
      } catch (error) {
        console.error('Error parsing saved Discord user:', error);
      }
    }
  }, [searchParams]);

  // Debug information (only in development)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('=== Discord User Detection Debug ===');
      console.log('URL Search Params:', Object.fromEntries(searchParams.entries()));
      console.log('Current Discord User ID:', discordUserId);
      console.log('Show Auth Options:', showAuthOptions);
      
      // Check localStorage
      const savedUser = localStorage.getItem('discord_user');
      if (savedUser) {
        console.log('Saved Discord User:', JSON.parse(savedUser));
      } else {
        console.log('No saved Discord user found');
      }
    }
  }, [searchParams, discordUserId, showAuthOptions]);

  const handleDiscordLogin = () => {
    if (discordUserId) {
      // Redirect to user dashboard with Discord ID
      router.push(`/dashboard?discordId=${discordUserId}`);
    }
  };

  const handleDiscordOAuth = async () => {
    try {
      setIsLoading(true);
      
      // Get Discord OAuth URL from API (same as login page)
      const response = await fetch('/api/auth/login');
      
      if (!response.ok) {
        throw new Error('Failed to get authentication URL');
      }
      
      const { authUrl } = await response.json();
      
      // Redirect to Discord OAuth
      window.location.href = authUrl;
      
    } catch (error) {
      console.error('Login error:', error);
      setIsLoading(false);
      alert('Failed to initiate Discord login. Please try again.');
    }
  };

  const handleGuestSession = () => {
    // Open new guest session page in a new tab, passing Discord ID if available
    const url = discordUserId ? `/session/new?discordId=${discordUserId}` : '/session/new';
    window.open(url, '_blank');
  };

  const handleNewSession = () => {
    // Open new session page in a new tab (for users coming without Discord context)
    window.open('/session/new', '_blank');
  };

  if (showAuthOptions && discordUserId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-12 text-center max-w-md">
          <div className="flex justify-center mb-6">
            <div className="bg-blue-100 p-4 rounded-full">
              <MessageSquare className="h-12 w-12 text-blue-600" />
            </div>
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Welcome to Modmail
          </h1>
          
          <p className="text-gray-600 mb-2">
            We detected you&apos;re coming from Discord
          </p>
          
          <p className="text-sm text-gray-500 mb-8">
            Discord ID: {discordUserId}
          </p>
          
          <div className="space-y-4">
            <button
              onClick={handleDiscordLogin}
              className="w-full px-8 py-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold text-lg flex items-center justify-center space-x-2"
            >
              <User className="h-5 w-5" />
              <span>Continue with Discord Account</span>
            </button>
            
            <button
              onClick={handleGuestSession}
              className="w-full px-8 py-4 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-semibold text-lg flex items-center justify-center space-x-2"
            >
              <Users className="h-5 w-5" />
              <span>Use Guest Session</span>
            </button>
          </div>
          
          <p className="text-xs text-gray-500 mt-6">
            Discord accounts can see chat history and manage multiple sessions
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-lg p-12 text-center max-w-md">
        <div className="flex justify-center mb-6">
          <div className="bg-blue-100 p-4 rounded-full">
            <MessageSquare className="h-12 w-12 text-blue-600" />
          </div>
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Modmail Support
        </h1>
        
        <p className="text-gray-600 mb-8">
          Need help? Start a conversation with our support team
        </p>
        
        <div className="space-y-4">
          <button
            onClick={handleDiscordOAuth}
            disabled={isLoading}
            className="w-full px-8 py-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold text-lg flex items-center justify-center space-x-2"
          >
            <User className="h-5 w-5" />
            <span>{isLoading ? 'Connecting to Discord...' : 'Continue with Discord'}</span>
          </button>
          
          <button
            onClick={handleNewSession}
            className="w-full px-8 py-4 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-semibold text-lg flex items-center justify-center space-x-2"
          >
            <Users className="h-5 w-5" />
            <span>Continue as Guest</span>
          </button>
        </div>
        
        <p className="text-xs text-gray-500 mt-6">
          Discord accounts can see chat history and manage multiple sessions
        </p>
        
        <div className="mt-8 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500 mb-2">Already a moderator?</p>
          <button
            onClick={() => router.push('/moderator')}
            className="text-sm text-blue-600 hover:text-blue-700 underline font-medium"
          >
            Go to Moderator Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
