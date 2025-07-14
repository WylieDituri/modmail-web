'use client';

import { useState } from 'react';
import { MessageSquare, ExternalLink, Shield, Users } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);

  const handleDiscordLogin = async () => {
    try {
      setIsLoading(true);
      
      // Get Discord OAuth URL from API
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <MessageSquare className="h-16 w-16 text-blue-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Moderator Login
          </h1>
          <p className="text-gray-600">
            Sign in with Discord to access the moderator dashboard
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-xl shadow-lg p-8 space-y-6">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Moderator Access Required
            </h2>
            <p className="text-gray-600 text-sm">
              Only authorized moderators can access this area
            </p>
          </div>

          {/* Discord Login Button */}
          <button
            onClick={handleDiscordLogin}
            disabled={isLoading}
            className="w-full bg-[#5865F2] hover:bg-[#4752C4] disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Connecting...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                </svg>
                <span>Continue with Discord</span>
                <ExternalLink className="w-4 h-4" />
              </>
            )}
          </button>

          {/* Features */}
          <div className="border-t pt-6 space-y-4">
            <h3 className="text-sm font-medium text-gray-900 text-center mb-3">
              What you can do:
            </h3>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-3 text-sm text-gray-600">
                <Users className="w-4 h-4 text-blue-500" />
                <span>Start conversations with server moderators</span>
              </div>
              
              <div className="flex items-center space-x-3 text-sm text-gray-600">
                <MessageSquare className="w-4 h-4 text-green-500" />
                <span>Get help and support in real-time</span>
              </div>
              
              <div className="flex items-center space-x-3 text-sm text-gray-600">
                <Shield className="w-4 h-4 text-purple-500" />
                <span>Secure and private communication</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500 space-y-3">
          <p>
            By signing in, you agree to use Discord&apos;s authentication system.
          </p>
          <p>
            No additional permissions will be requested beyond basic profile information.
          </p>
          <div className="pt-4 border-t border-gray-200">
            <Link 
              href="/"
              className="text-blue-600 hover:text-blue-700 underline"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
