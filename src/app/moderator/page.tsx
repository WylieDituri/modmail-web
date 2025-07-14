'use client';

import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { MessageSquare, Users, CheckCircle, Send, X, ChevronDown, ChevronRight, User, LogOut, Search } from 'lucide-react';
import { ChatSession, ModeratorStats, GroupedSessions, getMessageDisplayAuthor, getMessageDisplayName, Message } from '@/types';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';


// Memoized session item component to prevent unnecessary re-renders
const SessionItem = memo(function SessionItem({ 
  session, 
  isSelected, 
  onClick, 
  isUserInactive, 
  formatTimeAgo 
}: {
  session: ChatSession;
  isSelected: boolean;
  onClick: () => void;
  isUserInactive: (session: ChatSession) => boolean;
  formatTimeAgo: (date: Date | string) => string;
}) {
  const handleClick = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    onClick();
  }, [onClick]);

  return (
    <div
      className={`p-4 border-b cursor-pointer hover:bg-gray-50 transition-colors duration-150 ${
        isSelected ? 'bg-blue-50 border-blue-200' : ''
      }`}
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
              {session.status !== 'closed' && isUserInactive(session) && (
                <span className="px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded-full">
                  Inactive User
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500">{formatTimeAgo(session.lastActivity)}</p>
          </div>
        </div>
        <div className="flex items-center">
          <span className={`px-2 py-1 text-xs rounded-full ${
            session.status === 'active' 
              ? 'bg-green-100 text-green-800' 
              : session.status === 'closed'
              ? 'bg-gray-100 text-gray-800'
              : 'bg-yellow-100 text-yellow-800'
          }`}>
            {session.status}
          </span>
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
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [groupedSessions, setGroupedSessions] = useState<GroupedSessions[]>([]);
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'list' | 'grouped'>('grouped');
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);
  const [pendingSessionSelection, setPendingSessionSelection] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [replyAnonymously, setReplyAnonymously] = useState(false);
  // const [socket, setSocket] = useState<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previousSessionsRef = useRef<ChatSession[]>([]);
  const previousGroupedSessionsRef = useRef<GroupedSessions[]>([]);
  const previousStatsRef = useRef<ModeratorStats>({
    totalSessions: 0,
    activeSessions: 0,
    resolvedToday: 0,
    satisfactionRate: 0
  });
  const previousSelectedSessionMessagesRef = useRef<unknown[]>([]);
  const lastUpdatedRef = useRef<number>(0);
  const [lastMessageCount, setLastMessageCount] = useState(0);
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const [lastSelectedSessionId, setLastSelectedSessionId] = useState<string | null>(null);
  const [viewClosedSessions, setViewClosedSessions] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [stats, setStats] = useState<ModeratorStats>({
    totalSessions: 0,
    activeSessions: 0,
    resolvedToday: 0,
    satisfactionRate: 0
  });

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

  useEffect(() => {
    // TODO: Enable Socket.IO when server is ready
    // const socketConnection = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001');
    // setSocket(socketConnection);

    return () => {
      // TODO: Cleanup socket connection when enabled
      // socketConnection.close();
    };
  }, []);

  // Separate useEffect for data fetching that depends on authentication
  useEffect(() => {
    // Only fetch data if authenticated
    if (!isAuthenticated || isCheckingAuth) {
      return;
    }

    // Fetch sessions and stats from API
    const fetchData = async () => {
      try {
        // First check if data has been updated
        const lastUpdatedResponse = await fetch('/api/lastUpdated');
        if (lastUpdatedResponse.ok) {
          const { lastUpdated } = await lastUpdatedResponse.json();
          
          // Always fetch data on initial load or if data has been updated
          const isInitialLoad = lastUpdatedRef.current === 0;
          const hasUpdates = lastUpdated > lastUpdatedRef.current;
          
          if (isInitialLoad || hasUpdates) {
            console.log('Fetching sessions and stats...', { isInitialLoad, hasUpdates, lastUpdated, lastRef: lastUpdatedRef.current });
            
            const [sessionsResponse, groupedResponse, statsResponse] = await Promise.all([
              fetch('/api/sessions?includeAll=true'),
              fetch('/api/sessions/grouped?includeAll=true'),
              fetch('/api/stats')
            ]);

            if (sessionsResponse.ok) {
              const sessionsData = await sessionsResponse.json();
              
              // Check if there are changes before updating (skip on initial load)
              const hasSessionChanges = JSON.stringify(sessionsData) !== JSON.stringify(previousSessionsRef.current);
              
              if (isInitialLoad || hasSessionChanges) {
                console.log('Sessions data updated:', {
                  oldCount: previousSessionsRef.current.length,
                  newCount: sessionsData.length,
                  hasChanges: hasSessionChanges,
                  isInitialLoad
                });
                setSessions(sessionsData);
                previousSessionsRef.current = sessionsData;
              }
            }

            if (groupedResponse.ok) {
              const groupedData = await groupedResponse.json();
              
              // Check if there are changes before updating (skip on initial load)
              const hasGroupedChanges = JSON.stringify(groupedData) !== JSON.stringify(previousGroupedSessionsRef.current);
              
              if (isInitialLoad || hasGroupedChanges) {
                console.log('Grouped sessions data updated:', {
                  oldCount: previousGroupedSessionsRef.current.length,
                  newCount: groupedData.length,
                  hasChanges: hasGroupedChanges,
                  isInitialLoad,
                  groupedData: groupedData
                });
                setGroupedSessions(groupedData);
                previousGroupedSessionsRef.current = groupedData;
              }
            }

            if (statsResponse.ok) {
              const statsData = await statsResponse.json();
              
              // Check if stats have changed (skip on initial load)
              const hasStatsChanges = JSON.stringify(statsData) !== JSON.stringify(previousStatsRef.current);
              
              if (isInitialLoad || hasStatsChanges) {
                console.log('Stats data updated:', statsData, { isInitialLoad });
                setStats(statsData);
                previousStatsRef.current = statsData;
              }
            }
            
            lastUpdatedRef.current = lastUpdated;
          }
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
        // Only set default empty state on initial load, not on polling errors
        if (lastUpdatedRef.current === 0) {
          setSessions([]);
          setGroupedSessions([]);
          setStats({
            totalSessions: 0,
            activeSessions: 0,
            resolvedToday: 0,
            satisfactionRate: 0
          });
        }
      }
    };

    fetchData();

    // Increase polling interval to 5 seconds to reduce server load and UI flicker
    const interval = setInterval(fetchData, 5000);

    return () => {
      clearInterval(interval);
    };
  }, [isAuthenticated, isCheckingAuth]);

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
        
        // Always use the actual moderator's ID for logging, but mark as anonymous when needed
        const messageData = {
          content: message,
          authorId: moderator.id,
          authorName: moderator.username,
          sessionId: selectedSession.id,
          isAnonymous: replyAnonymously, // Add the isAnonymous flag
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
          const newMessage = await response.json();
          
          // Update session status to active when moderator responds
          await fetch(`/api/sessions/${selectedSession.id}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              status: 'active',
              moderatorId: moderator.id,
            }),
          });
          
          // Update local state with deduplication
          setSelectedSession(prev => {
            if (!prev) return prev;
            
            // Check if message already exists to prevent duplicates
            const messageExists = prev.messages.some(m => m.id === newMessage.id);
            if (messageExists) return prev;
            
            return {
              ...prev,
              status: 'active',
              messages: [...prev.messages, newMessage]
            };
          });

          setSessions(prev => prev.map(session => {
            if (session.id !== selectedSession.id) return session;
            
            // Check if message already exists to prevent duplicates
            const messageExists = session.messages.some(m => m.id === newMessage.id);
            if (messageExists) {
              return { ...session, status: 'active' };
            }
            
            return { 
              ...session, 
              status: 'active', 
              messages: [...session.messages, newMessage] 
            };
          }));

          setMessage('');
          
          // Scroll to bottom to show the new message
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
          }, 100);
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleCloseSession = async (sessionId: string) => {
    try {
      console.log('Closing session:', sessionId);
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
        const updatedSession = await response.json();
        console.log('Session closed successfully:', updatedSession);
        
        // Update the sessions list to mark as closed
        setSessions(prev => prev.map(session => 
          session.id === sessionId 
            ? { ...session, status: 'closed' as const }
            : session
        ));
        
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
        console.warn('Duplicate message detected:', message.id);
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

  // Reset message tracking when selected session changes
  useEffect(() => {
    if (selectedSession) {
      previousSelectedSessionMessagesRef.current = selectedSession.messages || [];
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
          console.log('Syncing selected session with sessions list');
          setSelectedSession(updatedSession);
        }
      }
    }
  }, [sessions, selectedSession]);

  // Enhanced message polling that integrates with main data fetching
  useEffect(() => {
    if (!selectedSession) return;

    const fetchSelectedSessionMessages = async () => {
      try {
        const response = await fetch(`/api/messages?sessionId=${selectedSession.id}`);
        if (response.ok) {
          const rawMessages = await response.json();
          const messages = deduplicateMessages(rawMessages);
          
          // Only update if messages have actually changed
          const messagesChanged = JSON.stringify(messages) !== JSON.stringify(previousSelectedSessionMessagesRef.current);
          
          if (messagesChanged) {
            console.log('Selected session messages updated:', {
              oldCount: previousSelectedSessionMessagesRef.current.length,
              newCount: messages.length
            });
            
            // Update both selected session and sessions list atomically
            const updatedSession = { ...selectedSession, messages };
            
            setSelectedSession(updatedSession);
            setSessions(prev => prev.map(session => 
              session.id === selectedSession.id 
                ? updatedSession
                : session
            ));
            
            previousSelectedSessionMessagesRef.current = messages;
          }
        } else {
          console.error('Failed to fetch messages - HTTP status:', response.status);
        }
      } catch (error) {
        console.error('Failed to fetch messages for selected session:', error);
      }
    };

    // Initial fetch
    fetchSelectedSessionMessages();
    
    // Set up polling (every 2 seconds) for the selected session - reduced frequency to reduce conflicts
    const messageInterval = setInterval(fetchSelectedSessionMessages, 2000);

    return () => {
      clearInterval(messageInterval);
    };
  }, [selectedSession, deduplicateMessages]);

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
    if (viewClosedSessions) {
      return sessions.filter(session => session.status === 'closed');
    }
    return sessions.filter(session => session.status !== 'closed');
  }, [viewClosedSessions]);

  // Helper function to get filtered grouped sessions
  const getFilteredGroupedSessions = useCallback((groups: GroupedSessions[]) => {
    if (viewClosedSessions) {
      // For closed view, only show groups that have closed sessions
      return groups.map(group => ({
        ...group,
        sessions: group.sessions.filter(session => session.status === 'closed')
      })).filter(group => group.sessions.length > 0);
    }
    // For active view, only show groups that have non-closed sessions
    return groups.map(group => ({
      ...group,
      sessions: group.sessions.filter(session => session.status !== 'closed')
    })).filter(group => group.sessions.length > 0);
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

  // Debug function to log filtering results
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('=== Session Filtering Debug ===');
      console.log('View Closed Sessions:', viewClosedSessions);
      console.log('Search Query:', debouncedSearchQuery);
      console.log('Total Sessions:', sessions.length);
      console.log('Filtered Sessions:', getFilteredSessions(sessions).length);
      console.log('Filtered + Searched Sessions:', filteredAndSearchedSessions.length);
      console.log('Total Groups:', groupedSessions.length);
      console.log('Filtered Groups:', getFilteredGroupedSessions(groupedSessions).length);
      console.log('Filtered + Searched Groups:', filteredAndSearchedGroupedSessions.length);
      
      // Log session statuses
      const sessionStatuses = sessions.reduce((acc, session) => {
        acc[session.status] = (acc[session.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      console.log('Session Statuses:', sessionStatuses);
    }
  }, [sessions, groupedSessions, viewClosedSessions, debouncedSearchQuery, getFilteredSessions, getFilteredGroupedSessions, filteredAndSearchedSessions, filteredAndSearchedGroupedSessions]);

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
            <span className="text-sm text-gray-600">
              Welcome, {user?.username}
            </span>
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
                            }`}
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
                                    <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                                      Guest
                                    </span>
                                    {group.hasActiveSession && (
                                      <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                                        Active
                                      </span>
                                    )}
                                    {group.hasNewMessages && (
                                      <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">
                                        New Messages
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-gray-500 mt-1">
                                    {group.sessions[0].messages.length} message{group.sessions[0].messages.length !== 1 ? 's' : ''} • {formatTimeAgo(group.latestActivity)}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className={`px-2 py-1 text-xs rounded-full ${
                                  group.sessions[0].status === 'active' 
                                    ? 'bg-green-100 text-green-800' 
                                    : group.sessions[0].status === 'closed'
                                    ? 'bg-gray-100 text-gray-800'
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {group.sessions[0].status}
                                </span>
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
                                    {group.hasActiveSession && (
                                      <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                                        Active
                                      </span>
                                    )}
                                    {group.hasNewMessages && (
                                      <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">
                                        New Messages
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-gray-500 mt-1">
                                    {group.sessions.length} session{group.sessions.length !== 1 ? 's' : ''} • Last active: {formatTimeAgo(group.latestActivity)}
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
                                    }`}
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
                                          {session.status !== 'closed' && isUserInactive(session) && (
                                            <span className="px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded-full">
                                              Inactive
                                            </span>
                                          )}
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">
                                          {session.messages.length} message{session.messages.length !== 1 ? 's' : ''} • {formatTimeAgo(session.createdAt)}
                                        </p>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <span className={`px-2 py-1 text-xs rounded-full ${
                                          session.status === 'active' 
                                            ? 'bg-green-100 text-green-800' 
                                            : session.status === 'closed'
                                            ? 'bg-gray-100 text-gray-800'
                                            : 'bg-yellow-100 text-yellow-800'
                                        }`}>
                                          {session.status}
                                        </span>
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
