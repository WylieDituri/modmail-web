'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { MessageSquare, Plus, Clock, CheckCircle2, AlertCircle, User, ExternalLink } from 'lucide-react';
import { ChatSession } from '@/types';
import { useAuth } from '@/hooks/useAuth';

function UserDashboardContent() {
  const router = useRouter();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const [userSessions, setUserSessions] = useState<ChatSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserSessions = useCallback(async (discordUserId: string) => {
    try {
      setIsLoading(true);
      
      // First, ensure user exists in the system
      await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          discordId: discordUserId,
          username: user?.username || `User#${discordUserId.slice(-4)}`,
          isModerator: false,
        }),
      });

      // Fetch all sessions and filter by this user's Discord ID
      const response = await fetch('/api/sessions?includeAll=true');
      if (response.ok) {
        const allSessions = await response.json();
        // Filter sessions for this Discord user
        const filteredSessions = allSessions.filter((session: ChatSession) => 
          session.user?.discordId === discordUserId
        );
        setUserSessions(filteredSessions);
      }
    } catch (error) {
      console.error('Failed to fetch user sessions:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.username]);

  useEffect(() => {
    if (authLoading) return; // Wait for auth check to complete
    
    if (!isAuthenticated || !user) {
      router.push('/');
      return;
    }

    // If user is a moderator, redirect them to the moderator dashboard
    if (user.isModerator) {
      router.push('/moderator');
      return;
    }

    fetchUserSessions(user.discordId);
  }, [authLoading, isAuthenticated, user, router, fetchUserSessions]);

  const handleCreateNewSession = async () => {
    if (!user?.discordId) return;

    try {
      // Create user if not exists
      const userResponse = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          discordId: user.discordId,
          username: user.username,
          isModerator: false,
        }),
      });

      if (userResponse.ok) {
        const userData = await userResponse.json();
        
        // Create a new session
        const sessionResponse = await fetch('/api/sessions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: userData.id,
          }),
        });

        if (sessionResponse.ok) {
          const sessionData = await sessionResponse.json();
          // Open the new session in a new tab
          window.open(`/session/${sessionData.id}`, '_blank');
          // Refresh the sessions list
          fetchUserSessions(user.discordId);
        }
      }
    } catch (error) {
      console.error('Failed to create new session:', error);
    }
  };

  const handleOpenSession = (sessionId: string) => {
    window.open(`/session/${sessionId}`, '_blank');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'waiting':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'active':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'closed':
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
      default:
        return null;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'waiting':
        return 'Waiting for moderator';
      case 'active':
        return 'Active conversation';
      case 'closed':
        return 'Closed';
      default:
        return 'Unknown';
    }
  };

  const formatTime = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    if (isNaN(dateObj.getTime())) {
      return 'Invalid date';
    }
    
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(dateObj);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your sessions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-indigo-100 p-2 rounded-full">
                <User className="h-6 w-6 text-indigo-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Your Support Sessions</h1>
                <p className="text-sm text-gray-600">Discord: {user?.username || 'User'}</p>
              </div>
            </div>
            <button
              onClick={handleCreateNewSession}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>New Session</span>
            </button>
          </div>
        </div>
      </div>

      {/* Sessions List */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {userSessions.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <MessageSquare className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No sessions yet</h3>
            <p className="text-gray-600 mb-6">
              Start your first conversation with our support team
            </p>
            <button
              onClick={handleCreateNewSession}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Your First Session
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {userSessions.map((session) => (
              <div
                key={session.id}
                className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(session.status)}
                        <span className={`text-sm font-medium ${
                          session.status === 'active' 
                            ? 'text-green-700' 
                            : session.status === 'waiting'
                            ? 'text-yellow-700'
                            : 'text-gray-700'
                        }`}>
                          {getStatusText(session.status)}
                        </span>
                      </div>
                      <span className="text-sm text-gray-500">
                        Created {formatTime(session.createdAt)}
                      </span>
                    </div>
                    <button
                      onClick={() => handleOpenSession(session.id)}
                      className="px-3 py-1 text-blue-600 border border-blue-200 rounded-md hover:bg-blue-50 transition-colors flex items-center space-x-1"
                    >
                      <span>Open</span>
                      <ExternalLink className="h-3 w-3" />
                    </button>
                  </div>
                  
                  <div className="border-l-4 border-gray-200 pl-4">
                    <p className="text-sm text-gray-600 mb-2">
                      Session ID: {session.id.slice(-8)}
                    </p>
                    <p className="text-sm text-gray-800">
                      {session.messages.length > 0 
                        ? `${session.messages.length} message${session.messages.length !== 1 ? 's' : ''}`
                        : 'No messages yet'
                      }
                    </p>
                    {session.messages.length > 0 && (
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                        Last message: &quot;{session.messages[session.messages.length - 1]?.content}&quot;
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function UserDashboard() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-4xl text-center">
          <MessageSquare className="h-12 w-12 text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    }>
      <UserDashboardContent />
    </Suspense>
  );
}
