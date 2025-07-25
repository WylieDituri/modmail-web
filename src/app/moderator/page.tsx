'use client';

import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { MessageSquare, Users, CheckCircle, Send, X, ChevronDown, ChevronRight, User, LogOut, Search, Pin, Clock, Shield } from 'lucide-react';
import { ChatSession, GroupedSessions, getMessageDisplayAuthor, getMessageDisplayName, getLastModeratorReply, Message } from '@/types';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useRealTimeData } from '@/hooks/useRealTimeDataSimple';


// Memoized session item component to prevent unnecessary re-renders
const SessionItem = memo(function SessionItem({ 
  session, 
  isSelected, 
  onClick, 
  isUserInactive, 
  formatTimeAgo,
  getSessionDuration,
  toggleSessionPin 
}: {
  session: ChatSession;
  isSelected: boolean;
  onClick: () => void;
  isUserInactive: (session: ChatSession) => boolean;
  formatTimeAgo: (date: Date | string) => string;
  getSessionDuration: (session: ChatSession) => string;
  toggleSessionPin: (sessionId: string, currentPinStatus: boolean) => void;
}) {
  const handleClick = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    onClick();
  }, [onClick]);

  const handlePinClick = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    toggleSessionPin(session.id, session.isPinned || false);
  }, [toggleSessionPin, session.id, session.isPinned]);

  return (
    <div
      className={`p-4 border-b cursor-pointer hover:bg-gray-50 transition-colors duration-150 ${
        isSelected ? 'bg-blue-50 border-blue-200' : ''
      } ${session.isPinned ? 'border-l-4 border-l-yellow-400' : ''}`}
      onClick={handleClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
            {session.user?.username?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="ml-3 flex-1">
            <div className="flex items-center space-x-2">
              <p className="text-sm font-medium text-gray-900">{session.user?.username || 'Unknown User'}</p>
              {session.isPinned && (
                <Pin className="h-3 w-3 text-yellow-600" />
              )}
              {session.status !== 'closed' && isUserInactive(session) && (
                <span className="px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded-full">
                  Inactive User
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2 mt-1">
              <p className="text-xs text-gray-500">{formatTimeAgo(session.lastActivity)}</p>
              <span className="text-xs text-gray-400">•</span>
              <div className="flex items-center space-x-1">
                <Clock className="h-3 w-3 text-gray-400" />
                <p className="text-xs text-gray-500">{getSessionDuration(session)}</p>
              </div>
              {getLastModeratorReply(session) && (
                <>
                  <span className="text-xs text-gray-400">•</span>
                  <p className="text-xs text-blue-600">Last reply: {getLastModeratorReply(session)}</p>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {session.status !== 'closed' && (
            <button
              onClick={handlePinClick}
              className={`p-1 rounded hover:bg-gray-100 ${
                session.isPinned ? 'text-yellow-600' : 'text-gray-400'
              }`}
              title={session.isPinned ? 'Unpin session' : 'Pin session'}
            >
              <Pin className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      <p className="text-xs text-gray-600 mt-2 truncate">
        {session.messages[session.messages.length - 1]?.content || 'No messages yet'}
      </p>
    </div>
  );
});

export default function ModeratorDashboard() {
  const router = useRouter();
  const { user, isLoading: isCheckingAuth, isAuthenticated, logout } = useAuth();
  
  // Use polling for real-time updates  
  const {
    sessions,
    groupedSessions,
    stats,
    optimisticPinUpdate,
    optimisticMessageUpdate,
    removeOptimisticUpdate,
    isSocketConnected,
    refetch
  } = useRealTimeData({
    isAuthenticated
  });

  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'list' | 'grouped'>('grouped');
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);
  const [pendingSessionSelection, setPendingSessionSelection] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [replyAnonymously, setReplyAnonymously] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [lastMessageCount, setLastMessageCount] = useState(0);
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const [lastSelectedSessionId, setLastSelectedSessionId] = useState<string | null>(null);
  const [viewClosedSessions, setViewClosedSessions] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  // Check if user is a moderator (middleware should already handle basic auth)
  useEffect(() => {
    if (!isCheckingAuth && isAuthenticated && user && !user.isModerator) {
      // Non-moderators should be redirected by middleware, but just in case
      router.push('/dashboard');
    }
  }, [isAuthenticated, isCheckingAuth, user, router]);

  // Handle logout
  const handleLogout = () => {
    logout();
  };

  // Debounce search query for better performance
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Simple, immediate session selection with no interference
  const handleSessionSelection = useCallback((session: ChatSession) => {
    // Immediately clear any pending operations
    setPendingSessionSelection(null);
    setHasNewMessages(false);
    
    // Clear any scroll timeouts to prevent interference
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = null;
    }
    
    // Set the session immediately - no delays, no debouncing
    setSelectedSession(session);
    setLastSelectedSessionId(session.id);
    setLastMessageCount(session.messages.length);
    
    // Force immediate scroll to bottom without animation
    // Use requestAnimationFrame to ensure DOM is updated first
    requestAnimationFrame(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'instant' });
      }
    });
  }, []);

  const handleSendMessage = async () => {
    if (!message.trim() || !selectedSession || !user) return;

    const messageContent = message;
    const isAnonymous = replyAnonymously;
    
    // Clear message input immediately for better UX
    setMessage('');

    try {
      // First ensure moderator user exists
      const moderatorResponse = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          discordId: user.discordId,
          username: user.username,
          isModerator: true,
        }),
      });

      if (moderatorResponse.ok) {
        const moderator = await moderatorResponse.json();
        
        // Create optimistic message object with a more unique temporary ID
        const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const optimisticMessage: Message = {
          id: tempId,
          content: messageContent,
          timestamp: new Date().toISOString(),
          authorId: moderator.id,
          sessionId: selectedSession.id,
          author: moderator,
          isAnonymous
        };

        // Apply optimistic update immediately
        const updateId = optimisticMessageUpdate(
          selectedSession.id,
          optimisticMessage,
          moderator.id // assignedModerator
        );

        // Scroll to bottom immediately to show optimistic message
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 50);
        
        // Always use the actual moderator's ID for logging, but mark as anonymous when needed
        const messageData = {
          content: messageContent,
          authorId: moderator.id,
          authorName: moderator.username,
          sessionId: selectedSession.id,
          isAnonymous, // Add the isAnonymous flag
        };
        
        // Create message via API
        const response = await fetch('/api/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(messageData),
        });

        if (response.ok) {
          await response.json(); // Get the response but we don't need to store it
          
          // Update session status to active when moderator responds
          await fetch(`/api/sessions/${selectedSession.id}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              status: 'active',
              assignedModerator: moderator.id,
            }),
          });
          
          // Don't manually remove optimistic update - let the hook handle it automatically
        } else {
          // Failed to send - revert optimistic update immediately
          console.error('Failed to send message');
          removeOptimisticUpdate(updateId);
          
          // Restore message input
          setMessage(messageContent);
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      // Restore message input on error
      setMessage(messageContent);
    }
  };

  const handleCloseSession = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'closed',
        }),
      });

      if (response.ok) {
        await response.json();
        
        // Note: Real-time hook will handle updating the sessions list
        
        // Clear selected session if it's the one being closed
        if (selectedSession?.id === sessionId) {
          setSelectedSession(null);
        }
      } else {
        console.error('Failed to close session - HTTP status:', response.status);
        const errorData = await response.text();
        console.error('Error response:', errorData);
      }
    } catch (error) {
      console.error('Failed to close session:', error);
    }
  };

  // Helper function to deduplicate messages by ID
  const deduplicateMessages = useCallback((messages: Message[]) => {
    const seen = new Set();
    return messages.filter((message) => {
      if (seen.has(message.id)) {
        return false;
      }
      seen.add(message.id);
      return true;
    });
  }, []);

  const formatTimeAgo = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    // Check if the date is valid
    if (isNaN(dateObj.getTime())) {
      return 'Invalid date';
    }
    
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - dateObj.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  // Reset message tracking when selected session changes - simplified since real-time handles updates
  useEffect(() => {
    if (selectedSession) {
      // Reset tracking for new session selection
      setLastMessageCount(selectedSession.messages.length);
    }
  }, [selectedSession]);

  // Sync selected session with sessions list to prevent flickering
  useEffect(() => {
    if (selectedSession && sessions.length > 0) {
      // Find the updated session in the sessions list
      const updatedSession = sessions.find(session => session.id === selectedSession.id);
      if (updatedSession) {
        // Only update if there are actual changes to prevent unnecessary re-renders
        const selectedSessionStr = JSON.stringify(selectedSession);
        const updatedSessionStr = JSON.stringify(updatedSession);
        
        if (selectedSessionStr !== updatedSessionStr) {
          setSelectedSession(updatedSession);
        }
      }
    }
  }, [sessions, selectedSession]);

  // Only handle scrolling for new messages in the SAME session
  useEffect(() => {
    if (!selectedSession || !lastSelectedSessionId) return;
    
    // Only scroll if we're staying in the same session and got new messages
    if (selectedSession.id === lastSelectedSessionId && 
        selectedSession.messages.length > lastMessageCount &&
        lastMessageCount > 0) {
      
      // Clear any existing scroll timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      
      // Smooth scroll for new messages only
      scrollTimeoutRef.current = setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 200);
      
      setLastMessageCount(selectedSession.messages.length);
    }
    
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = null;
      }
    };
  }, [selectedSession, lastSelectedSessionId, lastMessageCount]);

  // Track new messages and show notification
  useEffect(() => {
    if (selectedSession && selectedSession.messages.length > lastMessageCount) {
      const newMessages = selectedSession.messages.slice(lastMessageCount);
      const hasUserMessages = newMessages.some(msg => msg.author && !msg.author.isModerator);
      
      if (hasUserMessages && lastMessageCount > 0) {
        setHasNewMessages(true);
        // Clear the notification after 3 seconds
        setTimeout(() => setHasNewMessages(false), 3000);
      }
      
      setLastMessageCount(selectedSession.messages.length);
    }
  }, [selectedSession, lastMessageCount]);

  // Reset message count when switching sessions
  useEffect(() => {
    if (selectedSession) {
      setLastMessageCount(selectedSession.messages.length);
      setHasNewMessages(false);
    }
  }, [selectedSession]);

  // Helper function to check if user is inactive (no user message in last hour)
  const isUserInactive = (session: ChatSession) => {
    if (!session?.messages || session.messages.length === 0) return false;
    
    // Find the last message from the user (not moderator)
    const lastUserMessage = session.messages
      .filter(msg => msg.author && !msg.author.isModerator)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
    
    if (!lastUserMessage) return false;
    
    // Check if it's been more than an hour since the last user message
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);
    
    return new Date(lastUserMessage.timestamp) < oneHourAgo;
  };

  // Helper function to toggle user expansion
  const toggleUserExpansion = (discordId: string) => {
    setExpandedUsers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(discordId)) {
        newSet.delete(discordId);
      } else {
        newSet.add(discordId);
      }
      return newSet;
    });
  };

  // Helper function to get filtered sessions for display
  const getFilteredSessions = useCallback((sessions: ChatSession[]) => {
    const filtered = viewClosedSessions 
      ? sessions.filter(session => session.status === 'closed')
      : sessions.filter(session => session.status !== 'closed');
    
    // Sort pinned sessions to the top (only for open sessions)
    if (!viewClosedSessions) {
      return filtered.sort((a, b) => {
        // Pinned sessions first
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        // Then by last activity
        return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime();
      });
    }
    
    return filtered;
  }, [viewClosedSessions]);

  // Helper function to get filtered grouped sessions
  const getFilteredGroupedSessions = useCallback((groups: GroupedSessions[]) => {
    const filteredGroups = viewClosedSessions 
      ? groups.map(group => ({
          ...group,
          sessions: group.sessions.filter(session => session.status === 'closed')
        })).filter(group => group.sessions.length > 0)
      : groups.map(group => ({
          ...group,
          sessions: group.sessions.filter(session => session.status !== 'closed')
        })).filter(group => group.sessions.length > 0);
    
    // Sort groups by pinned sessions first (only for open sessions)
    if (!viewClosedSessions) {
      return filteredGroups.sort((a, b) => {
        const aPinned = a.sessions.some(session => session.isPinned);
        const bPinned = b.sessions.some(session => session.isPinned);
        
        // Groups with pinned sessions first
        if (aPinned && !bPinned) return -1;
        if (!aPinned && bPinned) return 1;
        
        // Then by latest activity
        return new Date(b.latestActivity).getTime() - new Date(a.latestActivity).getTime();
      });
    }
    
    return filteredGroups;
  }, [viewClosedSessions]);

  // Helper function to filter sessions by search query
  const filterSessionsBySearch = useCallback((sessions: ChatSession[], query: string) => {
    if (!query.trim()) return sessions;
    
    const searchLower = query.toLowerCase();
    return sessions.filter(session => {
      // Search in username
      if (session.user?.username?.toLowerCase().includes(searchLower)) {
        return true;
      }
      
      // Search in Discord ID
      if (session.user?.discordId?.toLowerCase().includes(searchLower)) {
        return true;
      }
      
      // Search in message content
      const hasMatchingMessage = session.messages.some(msg => 
        msg.content?.toLowerCase().includes(searchLower)
      );
      
      return hasMatchingMessage;
    });
  }, []);

  // Helper function to filter grouped sessions by search query
  const filterGroupedSessionsBySearch = useCallback((groups: GroupedSessions[], query: string) => {
    if (!query.trim()) return groups;
    
    const searchLower = query.toLowerCase();
    return groups.map(group => {
      // Check if user matches search
      const userMatches = group.user?.username?.toLowerCase().includes(searchLower) ||
                         group.user?.discordId?.toLowerCase().includes(searchLower);
      
      // Filter sessions within the group by search
      const filteredSessions = group.sessions.filter(session => {
        // Include session if user matches or if any message content matches
        return userMatches || session.messages.some(msg => 
          msg.content?.toLowerCase().includes(searchLower)
        );
      });
      
      return {
        ...group,
        sessions: filteredSessions
      };
    }).filter(group => group.sessions.length > 0); // Only keep groups with matching sessions
  }, []);

  // Memoized filtered sessions to prevent unnecessary recalculations
  const filteredAndSearchedSessions = useMemo(() => {
    const filtered = getFilteredSessions(sessions);
    return filterSessionsBySearch(filtered, debouncedSearchQuery);
  }, [sessions, debouncedSearchQuery, getFilteredSessions, filterSessionsBySearch]);

  // Memoized filtered grouped sessions to prevent unnecessary recalculations
  const filteredAndSearchedGroupedSessions = useMemo(() => {
    const filtered = getFilteredGroupedSessions(groupedSessions);
    return filterGroupedSessionsBySearch(filtered, debouncedSearchQuery);
  }, [groupedSessions, debouncedSearchQuery, getFilteredGroupedSessions, filterGroupedSessionsBySearch]);

  // Helper function to calculate session duration
  const getSessionDuration = useCallback((session: ChatSession) => {
    const startTime = new Date(session.createdAt);
    const endTime = session.status === 'closed' && session.closedAt 
      ? new Date(session.closedAt) 
      : new Date();
    
    const diffInMinutes = Math.floor((endTime.getTime() - startTime.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m`;
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60);
      const minutes = diffInMinutes % 60;
      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    } else {
      const days = Math.floor(diffInMinutes / 1440);
      const hours = Math.floor((diffInMinutes % 1440) / 60);
      return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
    }
  }, []);

  // Helper function to toggle session pin status with optimistic updates
  const toggleSessionPin = useCallback(async (sessionId: string, currentPinStatus: boolean) => {
    try {
      // Apply optimistic update immediately
      const updateId = optimisticPinUpdate(
        sessionId, 
        !currentPinStatus, 
        user?.discordId
      );
      
      const response = await fetch(`/api/sessions/${sessionId}/pin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ pin: !currentPinStatus }),
      });
      
      if (response.ok) {
        await response.json();
        // Don't manually remove optimistic update - let the hook handle it automatically
      } else {
        const errorData = await response.text();
        console.error('Failed to toggle session pin - status:', response.status, 'error:', errorData);
        // Remove failed optimistic update immediately
        removeOptimisticUpdate(updateId);
      }
    } catch (error) {
      console.error('Failed to toggle session pin:', error);
      // Remove failed optimistic update (if we have the updateId)
    }
  }, [user, optimisticPinUpdate, removeOptimisticUpdate]);

  // Show loading spinner while checking auth
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-600 mx-auto"></div>
          <p className="text-slate-600 mt-4">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Don't render dashboard if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Moderator Dashboard</h1>
          <div className="flex items-center space-x-4">
            {/* Real-time connection status */}
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${isSocketConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-xs text-gray-500">
                {isSocketConnected ? 'Real-time' : 'Polling'}
              </span>
            </div>
            <button
              onClick={refetch}
              className="text-sm text-gray-600 hover:text-gray-800 transition-colors"
              title="Refresh data"
            >
              🔄
            </button>
            <span className="text-sm text-gray-600">
              Welcome, {user?.username}
            </span>
            {user?.isAdmin && (
              <button
                onClick={() => router.push('/admin')}
                className="flex items-center space-x-2 px-3 py-2 text-sm text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-colors border border-blue-200"
              >
                <Shield className="h-4 w-4" />
                <span>Admin Panel</span>
              </button>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <MessageSquare className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Sessions</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalSessions}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Sessions</p>
                <p className="text-2xl font-bold text-gray-900">{stats.activeSessions}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Resolved Today</p>
                <p className="text-2xl font-bold text-gray-900">{stats.resolvedToday}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="h-8 w-8 text-green-600 flex items-center justify-center">
                👍
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Satisfaction Rate</p>
                <p className="text-2xl font-bold text-gray-900">{stats.satisfactionRate}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Session List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-semibold text-gray-900">
                    {viewClosedSessions ? 'Closed Sessions' : 'Active Sessions'}
                  </h2>
                  <button
                    onClick={() => setViewClosedSessions(!viewClosedSessions)}
                    className="px-3 py-1 text-sm text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                  >
                    {viewClosedSessions ? 'View Active' : 'View Closed'}
                  </button>
                </div>
                
                {/* Search Input */}
                <div className="mb-3">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      placeholder="Search users, content..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                    {searchQuery && (
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                        <button
                          onClick={() => setSearchQuery('')}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setViewMode('list')}
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${
                      viewMode === 'list' 
                        ? 'bg-blue-600 text-white' 
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    List View
                  </button>
                  <button
                    onClick={() => setViewMode('grouped')}
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${
                      viewMode === 'grouped' 
                        ? 'bg-blue-600 text-white' 
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    Grouped by User
                  </button>
                </div>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {viewMode === 'list' ? (
                  // List View
                  filteredAndSearchedSessions.length === 0 ? (
                    <div className="p-8 text-center">
                      <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        {debouncedSearchQuery ? 'No Matching Sessions' : (viewClosedSessions ? 'No Closed Sessions' : 'No Active Sessions')}
                      </h3>
                      <p className="text-gray-500">
                        {debouncedSearchQuery 
                          ? 'No sessions match your search criteria' 
                          : (viewClosedSessions 
                            ? 'No sessions have been closed yet' 
                            : 'No users are currently waiting for support')
                        }
                      </p>
                    </div>
                  ) : (
                    filteredAndSearchedSessions.map((session: ChatSession) => (
                      <SessionItem
                        key={session.id}
                        session={session}
                        isSelected={selectedSession?.id === session.id || pendingSessionSelection === session.id}
                        onClick={() => handleSessionSelection(session)}
                        isUserInactive={isUserInactive}
                        formatTimeAgo={formatTimeAgo}
                        getSessionDuration={getSessionDuration}
                        toggleSessionPin={toggleSessionPin}
                      />
                    ))
                  )
                ) : (
                  // Grouped View
                  filteredAndSearchedGroupedSessions.length === 0 ? (
                    <div className="p-8 text-center">
                      <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        {debouncedSearchQuery ? 'No Matching Users' : (viewClosedSessions ? 'No Closed Sessions' : 'No Active Users')}
                      </h3>
                      <p className="text-gray-500">
                        {debouncedSearchQuery 
                          ? 'No users or sessions match your search criteria' 
                          : (viewClosedSessions 
                            ? 'No sessions have been closed yet' 
                            : 'No users are currently waiting for support')
                        }
                      </p>
                    </div>
                  ) : (
                    filteredAndSearchedGroupedSessions.map((group: GroupedSessions) => (
                      <div key={group.user.discordId} className="border-b">
                        {group.isGuestUser ? (
                          // Guest User - Display as individual session (no expand/collapse)
                          <div
                            className={`p-4 cursor-pointer hover:bg-gray-50 ${
                              selectedSession?.id === group.sessions[0].id ? 'bg-blue-50 border-blue-200' : ''
                            } ${group.sessions[0].isPinned ? 'border-l-4 border-l-yellow-400' : ''}`}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleSessionSelection(group.sessions[0]);
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                                  {group.user.username?.[0]?.toUpperCase() || 'G'}
                                </div>
                                <div className="ml-3 flex-1">
                                  <div className="flex items-center space-x-2">
                                    <p className="text-sm font-medium text-gray-900">{group.user.username || 'Guest User'}</p>
                                    {group.sessions[0].isPinned && (
                                      <Pin className="h-3 w-3 text-yellow-600" />
                                    )}
                                    <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                                      Guest
                                    </span>
                                    {group.hasNewMessages && (
                                      <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">
                                        New Messages
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center space-x-2 mt-1">
                                    <p className="text-xs text-gray-500">
                                      {group.sessions[0].messages.length} message{group.sessions[0].messages.length !== 1 ? 's' : ''} • {formatTimeAgo(group.latestActivity)}
                                    </p>
                                    <span className="text-xs text-gray-400">•</span>
                                    <div className="flex items-center space-x-1">
                                      <Clock className="h-3 w-3 text-gray-400" />
                                      <p className="text-xs text-gray-500">{getSessionDuration(group.sessions[0])}</p>
                                    </div>
                                    {getLastModeratorReply(group.sessions[0]) && (
                                      <>
                                        <span className="text-xs text-gray-400">•</span>
                                        <p className="text-xs text-blue-600">Last reply: {getLastModeratorReply(group.sessions[0])}</p>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                {group.sessions[0].status !== 'closed' && (
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      toggleSessionPin(group.sessions[0].id, group.sessions[0].isPinned || false);
                                    }}
                                    className={`p-1 rounded hover:bg-gray-100 ${
                                      group.sessions[0].isPinned ? 'text-yellow-600' : 'text-gray-400'
                                    }`}
                                    title={group.sessions[0].isPinned ? 'Unpin session' : 'Pin session'}
                                  >
                                    <Pin className="h-4 w-4" />
                                  </button>
                                )}
                                {group.sessions[0].status === 'closed' && group.sessions[0].satisfactionRating && (
                                  <span className={`px-2 py-1 text-xs rounded-full ${
                                    group.sessions[0].satisfactionRating === 'thumbs_up'
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-red-100 text-red-800'
                                  }`}>
                                    {group.sessions[0].satisfactionRating === 'thumbs_up' ? '👍 Positive' : '👎 Negative'}
                                  </span>
                                )}
                              </div>
                            </div>
                            <p className="text-xs text-gray-600 mt-1 truncate">
                              {group.sessions[0].messages[group.sessions[0].messages.length - 1]?.content || 'No messages yet'}
                            </p>
                          </div>
                        ) : (
                          // Authenticated Discord User - Display as expandable group
                          <>
                            {/* User Header */}
                            <div
                              className="p-4 hover:bg-gray-50 cursor-pointer flex items-center justify-between"
                              onClick={() => toggleUserExpansion(group.user.discordId)}
                            >
                              <div className="flex items-center">
                                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                                  {group.user.username?.[0]?.toUpperCase() || 'U'}
                                </div>
                                <div className="ml-3 flex-1">
                                  <div className="flex items-center space-x-2">
                                    <p className="text-sm font-medium text-gray-900">{group.user.username || 'Unknown User'}</p>
                                    {group.hasNewMessages && (
                                      <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">
                                        New Messages
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-gray-500 mt-1">
                                    {group.sessions.length} session{group.sessions.length !== 1 ? 's' : ''} • Last active: {formatTimeAgo(group.latestActivity)}
                                    {/* Show moderator name from the most recent session */}
                                    {(() => {
                                      const mostRecentSession = group.sessions
                                        .sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime())[0];
                                      const lastMod = getLastModeratorReply(mostRecentSession);
                                      return lastMod ? ` • Last reply: ${lastMod}` : '';
                                    })()}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                {expandedUsers.has(group.user.discordId) ? (
                                  <ChevronDown className="h-4 w-4 text-gray-500" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 text-gray-500" />
                                )}
                              </div>
                            </div>
                            
                            {/* Expanded Sessions */}
                            {expandedUsers.has(group.user.discordId) && (
                              <div className="bg-gray-50">
                                {group.sessions.map((session: ChatSession) => (
                                  <div
                                    key={session.id}
                                    className={`p-3 ml-4 border-l-2 cursor-pointer hover:bg-gray-100 ${
                                      selectedSession?.id === session.id ? 'bg-blue-50 border-blue-400' : 'border-gray-200'
                                    } ${session.isPinned ? 'border-l-4 border-l-yellow-400' : ''}`}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleSessionSelection(session);
                                    }}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex-1">
                                        <div className="flex items-center space-x-2">
                                          <p className="text-sm text-gray-900">
                                            Session {session.id.slice(-6)}
                                          </p>
                                          {session.isPinned && (
                                            <Pin className="h-3 w-3 text-yellow-600" />
                                          )}
                                          {session.status !== 'closed' && isUserInactive(session) && (
                                            <span className="px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded-full">
                                              Inactive
                                            </span>
                                          )}
                                        </div>
                                        <div className="flex items-center space-x-2 mt-1">
                                          <p className="text-xs text-gray-500">
                                            {session.messages.length} message{session.messages.length !== 1 ? 's' : ''} • {formatTimeAgo(session.createdAt)}
                                          </p>
                                          <span className="text-xs text-gray-400">•</span>
                                          <div className="flex items-center space-x-1">
                                            <Clock className="h-3 w-3 text-gray-400" />
                                            <p className="text-xs text-gray-500">{getSessionDuration(session)}</p>
                                          </div>
                                          {getLastModeratorReply(session) && (
                                            <>
                                              <span className="text-xs text-gray-400">•</span>
                                              <p className="text-xs text-blue-600">Last reply: {getLastModeratorReply(session)}</p>
                                            </>
                                          )}
                                        </div>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        {session.status !== 'closed' && (
                                          <button
                                            onClick={(e) => {
                                              e.preventDefault();
                                              e.stopPropagation();
                                              toggleSessionPin(session.id, session.isPinned || false);
                                            }}
                                            className={`p-1 rounded hover:bg-gray-100 ${
                                              session.isPinned ? 'text-yellow-600' : 'text-gray-400'
                                            }`}
                                            title={session.isPinned ? 'Unpin session' : 'Pin session'}
                                          >
                                            <Pin className="h-4 w-4" />
                                          </button>
                                        )}
                                        {session.status === 'closed' && session.satisfactionRating && (
                                          <span className={`px-2 py-1 text-xs rounded-full ${
                                            session.satisfactionRating === 'thumbs_up'
                                              ? 'bg-green-100 text-green-800'
                                              : 'bg-red-100 text-red-800'
                                          }`}>
                                            {session.satisfactionRating === 'thumbs_up' ? '👍' : '👎'}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <p className="text-xs text-gray-600 mt-1 truncate">
                                      {session.messages[session.messages.length - 1]?.content || 'No messages yet'}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    ))
                  )
                )}
              </div>
            </div>
          </div>

          {/* Chat Interface */}
          <div className="lg:col-span-2">
            {selectedSession ? (
              <div className="bg-white rounded-lg shadow h-96 flex flex-col">
                {/* Chat Header */}
                <div className="p-4 border-b flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                      {selectedSession.user?.username?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900">{selectedSession.user?.username || 'Unknown User'}</p>
                      <div className="flex items-center space-x-2">
                        <p className="text-xs text-gray-500">Session started {formatTimeAgo(selectedSession.createdAt)}</p>
                        {selectedSession.status === 'closed' && selectedSession.satisfactionRating && (
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            selectedSession.satisfactionRating === 'thumbs_up'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {selectedSession.satisfactionRating === 'thumbs_up' ? '👍 Positive Feedback' : '👎 Negative Feedback'}
                          </span>
                        )}
                      </div>
                    </div>
                    {hasNewMessages && (
                      <div className="ml-2 flex items-center">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="ml-1 text-xs text-green-600 font-medium">New message</span>
                      </div>
                    )}
                  </div>
                  {selectedSession.status !== 'closed' && (
                    <button
                      onClick={() => handleCloseSession(selectedSession.id)}
                      className="p-2 text-gray-400 hover:text-red-600 rounded-full hover:bg-gray-100"
                      title="Close Session"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  )}
                  {selectedSession.status === 'closed' && (
                    <div className="px-3 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                      Session Closed
                    </div>
                  )}
                </div>

                {/* Messages */}
                <div 
                  key={`messages-${selectedSession.id}`}
                  className="flex-1 overflow-y-auto p-4 space-y-4"
                >
                  {deduplicateMessages(selectedSession.messages).map((msg, index) => {
                    const displayAuthor = getMessageDisplayAuthor(msg, 'moderator');
                    const displayName = getMessageDisplayName(msg, 'moderator');
                    
                    return (
                      <div
                        key={`${msg.id}-${index}`}
                        className={`flex ${displayAuthor?.isModerator ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          displayAuthor?.isModerator 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-gray-100 text-gray-900'
                        }`}>
                          <p className="text-sm">{msg.content}</p>
                          <p className={`text-xs mt-1 ${
                            displayAuthor?.isModerator ? 'text-blue-100' : 'text-gray-500'
                          }`}>
                            {displayName || 'Unknown'} • {formatTimeAgo(msg.timestamp)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} /> {/* Scroll target */}
                </div>

                {/* Message Input */}
                <div className="p-4 border-t">
                  {selectedSession.status !== 'closed' ? (
                    <div className="space-y-3">
                      {/* Anonymous reply toggle */}
                      <div className="flex items-center space-x-2">
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={replyAnonymously}
                            onChange={(e) => setReplyAnonymously(e.target.checked)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <span className="text-sm text-gray-700">Reply anonymously as Staff</span>
                        </label>
                      </div>
                      
                      {/* Message input */}
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                          placeholder="Type your message..."
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                        />
                        <button
                          onClick={handleSendMessage}
                          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <Send className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-3">
                      <p className="text-gray-500 text-sm">This session has been closed. No new messages can be sent.</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow h-96 flex items-center justify-center">
                <div className="text-center">
                  <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900">Select a session to start chatting</h3>
                  <p className="text-gray-500">Choose a session from the list to view messages and respond</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
