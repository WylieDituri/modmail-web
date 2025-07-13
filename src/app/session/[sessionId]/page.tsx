'use client';

import { useState, useEffect, useRef } from 'react';
// import { io, Socket } from 'socket.io-client';
import { Send, MessageSquare, Clock, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { ChatSession, getMessageDisplayAuthor, getMessageDisplayName } from '@/types';
import { useRouter } from 'next/navigation';

interface PageProps {
  params: Promise<{ sessionId: string }>;
}

export default function UserSession({ params }: PageProps) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const router = useRouter();
  const [discordId, setDiscordId] = useState<string | null>(null);
  const [session, setSession] = useState<ChatSession | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [message, setMessage] = useState('');
  const [initialMessage, setInitialMessage] = useState('');
  // const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [sessionStatus, setSessionStatus] = useState<'connecting' | 'waiting' | 'active' | 'closed'>('connecting');
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [satisfactionRating, setSatisfactionRating] = useState<'thumbs_up' | 'thumbs_down' | null>(null);
  const [showSatisfactionRating, setShowSatisfactionRating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastUpdatedRef = useRef<number>(0);

  // Get sessionId from params
  useEffect(() => {
    const getParams = async () => {
      const resolvedParams = await params;
      setSessionId(resolvedParams.sessionId);
      setIsInitializing(false);
    };
    getParams();
  }, [params]);

  // Check for Discord ID from URL parameters
  useEffect(() => {
    // Check if Discord user ID is provided in URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('discordId') || urlParams.get('userId') || urlParams.get('user_id');
    if (userId) {
      setDiscordId(userId);
    }
  }, []);

  // Check for existing session when sessionId is available
  useEffect(() => {
    if (isInitializing || !sessionId) return;
    
    // If sessionId is 'new', we'll wait for user to create a session
    if (sessionId === 'new') {
      setIsConnected(true);
      setSessionStatus('connecting');
      setIsLoadingSession(false);
      return;
    }

    // Try to restore the session using the sessionId from URL
    setIsLoadingSession(true);
    fetch(`/api/sessions/${sessionId}`)
      .then(response => {
        if (response.ok) {
          return response.json();
        }
        throw new Error('Session not found');
      })
      .then(sessionData => {
        setSession(sessionData);
        setSessionStatus(sessionData.status);
        setIsConnected(true);
        setIsLoadingSession(false);
      })
      .catch(error => {
        console.log('Could not restore session:', error);
        // Redirect to new session if session doesn't exist
        router.push('/session/new');
        setIsLoadingSession(false);
      });
  }, [sessionId, router, isInitializing]);

  useEffect(() => {
    // TODO: Enable Socket.IO when server is ready
    // const socketConnection = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001');
    // setSocket(socketConnection);

    // Don't auto-create session, wait for user to submit initial message
    setIsConnected(true);
    setSessionStatus('connecting');

    // TODO: Enable Socket.IO when server is ready
    // socketConnection.on('connect', () => {
    //   setIsConnected(true);
    // });

    // socketConnection.on('disconnect', () => {
    //   setIsConnected(false);
    // });

    // socketConnection.on('message-received', (newMessage: Message) => {
    //   setSession(prev => prev ? {
    //     ...prev,
    //     messages: [...prev.messages, newMessage]
    //   } : null);
    // });

    return () => {
      // TODO: Cleanup socket connection when enabled
      // socketConnection.close();
    };
  }, []);

  // Update window title based on session status
  useEffect(() => {
    if (session && sessionId && sessionId !== 'new') {
      const shortId = sessionId.slice(-6); // Last 6 characters of session ID
      document.title = `Session ${shortId} - ${session.status === 'active' ? 'Active' : session.status === 'waiting' ? 'Waiting' : 'Closed'}`;
    } else if (sessionId === 'new') {
      document.title = 'New Support Session';
    } else {
      document.title = 'Support Session';
    }
  }, [session, sessionId]);

  // Poll for new messages when session exists
  useEffect(() => {
    if (!session || !sessionId || sessionId === 'new') return;

    const fetchSessionData = async () => {
      try {
        // First check if data has been updated
        const lastUpdatedResponse = await fetch('/api/lastUpdated');
        if (lastUpdatedResponse.ok) {
          const { lastUpdated } = await lastUpdatedResponse.json();
          
          // Only fetch full data if it's been updated
          if (lastUpdated > lastUpdatedRef.current) {
            console.log('Data has been updated, fetching session data...');
            
            const [messagesResponse, sessionResponse] = await Promise.all([
              fetch(`/api/messages?sessionId=${sessionId}`),
              fetch(`/api/sessions/${sessionId}`)
            ]);

            if (messagesResponse.ok && sessionResponse.ok) {
              const [messages, sessionData] = await Promise.all([
                messagesResponse.json(),
                sessionResponse.json()
              ]);
              
              // Check if there are actually changes before updating
              const hasNewMessages = messages.length !== session.messages.length;
              const hasStatusChange = sessionData.status !== session.status;
              const hasLastActivityChange = sessionData.lastActivity !== session.lastActivity;
              
              if (hasNewMessages || hasStatusChange || hasLastActivityChange) {
                console.log('Session data updated:', {
                  hasNewMessages,
                  hasStatusChange,
                  hasLastActivityChange,
                  oldMessageCount: session.messages.length,
                  newMessageCount: messages.length
                });
                
                setSession(prev => prev ? {
                  ...prev,
                  ...sessionData,
                  messages: messages
                } : null);
                
                // Update session status based on the latest data
                setSessionStatus(sessionData.status);
              }
            }
            
            lastUpdatedRef.current = lastUpdated;
          }
        }
      } catch (error) {
        console.error('Failed to fetch session data:', error);
      }
    };

    // Initial fetch
    fetchSessionData();
    
    // Set up polling every 2 seconds to check for new messages and session status
    const interval = setInterval(fetchSessionData, 2000);

    return () => {
      clearInterval(interval);
    };
  }, [session, sessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session?.messages]);

  const handleSendMessage = async () => {
    if (!message.trim() || !session) return;

    try {
      // Send message via API
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: message,
          authorId: session.userId,
          sessionId: session.id,
        }),
      });

      if (response.ok) {
        const newMessage = await response.json();
        
        setSession(prev => prev ? {
          ...prev,
          messages: [...prev.messages, newMessage]
        } : null);

        setMessage('');
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const createSessionWithMessage = async () => {
    if (!initialMessage.trim()) return;
    
    setIsCreatingSession(true);
    try {
      // Determine user details based on Discord context
      const userDetails = discordId ? {
        discordId: discordId,
        username: `User#${discordId.slice(-4)}`,
        isModerator: false,
      } : {
        discordId: 'current-user-' + Date.now(),
        username: 'Guest User',
        isModerator: false,
      };

      // First create/get a user
      const userResponse = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userDetails),
      });

      if (!userResponse.ok) {
        throw new Error('Failed to create user');
      }

      const user = await userResponse.json();
      console.log('User created:', user);
      
      // Add a small delay to ensure user is properly stored
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Create a new session
      const sessionResponse = await fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
        }),
      });

      if (!sessionResponse.ok) {
        const errorData = await sessionResponse.json();
        throw new Error(`Failed to create session: ${errorData.error}`);
      }

      const sessionData = await sessionResponse.json();
      console.log('Session created:', sessionData);
      
      // Send the initial message
      const messageResponse = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: initialMessage,
          authorId: user.id,
          sessionId: sessionData.id,
        }),
      });

      if (!messageResponse.ok) {
        throw new Error('Failed to send initial message');
      }

      const newMessage = await messageResponse.json();
      
      // Redirect to the session URL instead of storing in localStorage
      router.push(`/session/${sessionData.id}`);
      
      setSession({
        ...sessionData,
        messages: [newMessage]
      });
      setSessionStatus('waiting');
      setInitialMessage('');
    } catch (error) {
      console.error('Failed to create session:', error);
      setSessionStatus('closed');
      alert('Failed to create ticket. Please try again.');
    } finally {
      setIsCreatingSession(false);
    }
  };

  const handleCloseSession = async () => {
    if (!session) return;

    try {
      const response = await fetch(`/api/sessions/${session.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'closed',
        }),
      });

      if (response.ok) {
        setSession(prev => prev ? { ...prev, status: 'closed' } : null);
        setSessionStatus('closed');
      }
    } catch (error) {
      console.error('Failed to close session:', error);
    }
  };

  const handleStartNewSession = () => {
    // Redirect to new session page
    router.push('/session/new');
  };

  const formatTime = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    // Check if the date is valid
    if (isNaN(dateObj.getTime())) {
      return 'Invalid date';
    }
    
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(dateObj);
  };

  const getStatusIcon = () => {
    switch (sessionStatus) {
      case 'connecting':
        return <Clock className="h-4 w-4 text-yellow-500 animate-spin" />;
      case 'waiting':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'active':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'closed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusText = () => {
    switch (sessionStatus) {
      case 'connecting':
        return 'Connecting...';
      case 'waiting':
        return 'Waiting for moderator';
      case 'active':
        return 'Connected to moderator';
      case 'closed':
        return 'Session closed';
      default:
        return 'Unknown status';
    }
  };

  // Handle satisfaction rating submission
  const handleSatisfactionRating = async (rating: 'thumbs_up' | 'thumbs_down') => {
    if (!session?.id) return;
    
    try {
      const response = await fetch(`/api/sessions/${session.id}/satisfaction`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ satisfactionRating: rating }),
      });

      if (response.ok) {
        // Update both local state and session data
        setSatisfactionRating(rating);
        setSession(prev => prev ? {
          ...prev,
          satisfactionRating: rating
        } : null);
        setShowSatisfactionRating(false);
        
        console.log('Satisfaction rating submitted:', rating);
      } else {
        console.error('Failed to submit satisfaction rating');
      }
    } catch (error) {
      console.error('Error submitting satisfaction rating:', error);
    }
  };

  // Show satisfaction rating when session is closed (but only once)
  useEffect(() => {
    if (session?.status === 'closed' && !session.satisfactionRating && !satisfactionRating && !showSatisfactionRating) {
      setShowSatisfactionRating(true);
    }
    
    // If session already has a rating, sync it with local state
    if (session?.satisfactionRating && !satisfactionRating) {
      setSatisfactionRating(session.satisfactionRating);
    }
  }, [session?.status, session?.satisfactionRating, satisfactionRating, showSatisfactionRating]);

  // Show loading spinner while initializing or loading existing session
  if (isInitializing || isLoadingSession) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full mx-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {isInitializing ? 'Initializing...' : 'Loading Session'}
            </h1>
            <p className="text-gray-600">
              {isInitializing ? 'Please wait...' : 'Please wait while we load your support session...'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show create form only for new sessions
  if (!session && sessionId === 'new') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full mx-4">
          <div className="text-center mb-6">
            <MessageSquare className="h-12 w-12 text-blue-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Create Support Ticket</h1>
            <p className="text-gray-600">Describe your issue and we&apos;ll connect you with a moderator</p>
          </div>
          
          <form onSubmit={(e) => { e.preventDefault(); createSessionWithMessage(); }} className="space-y-4">
            <div>
              <label htmlFor="initialMessage" className="block text-sm font-medium text-gray-700 mb-2">
                How can we help you?
              </label>
              <textarea
                id="initialMessage"
                value={initialMessage}
                onChange={(e) => setInitialMessage(e.target.value)}
                placeholder="Please describe your issue or question..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                rows={4}
                disabled={isCreatingSession}
                required
              />
            </div>
            
            <button
              type="submit"
              disabled={!initialMessage.trim() || isCreatingSession}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isCreatingSession ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Creating ticket...</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span>Create Ticket</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // If session is null after loading, show error or redirect
  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full mx-4">
          <div className="text-center">
            <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Session Not Found</h1>
            <p className="text-gray-600 mb-4">The session you&apos;re looking for doesn&apos;t exist or has been removed.</p>
            <button
              onClick={() => router.push('/session/new')}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Create New Session
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Support Chat</h1>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                {getStatusIcon()}
                <span className="text-sm text-gray-600">{getStatusText()}</span>
              </div>
              {session && sessionStatus !== 'closed' && (
                <button
                  onClick={handleCloseSession}
                  className="px-3 py-1 text-sm text-red-600 border border-red-200 rounded-md hover:bg-red-50 transition-colors"
                  title="Close Session"
                >
                  <div className="flex items-center space-x-1">
                    <X className="h-4 w-4" />
                    <span>Close Session</span>
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Chat Container */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow h-[600px] flex flex-col">
          {/* Session Info */}
          <div className="p-4 border-b bg-gray-50">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Support Session</h2>
                <div className="flex items-center space-x-2">
                  <p className="text-sm text-gray-600">
                    {session ? (
                      <>Started {formatTime(session.createdAt)} • Session ID: {session.id.slice(-8)}</>
                    ) : sessionId && sessionId !== 'new' ? (
                      <>Session ID: {sessionId.slice(-8)}</>
                    ) : (
                      'New Support Session'
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-1">
                <div className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-green-500' : 'bg-red-500'
                }`}></div>
                <span className="text-xs text-gray-500">
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {session.messages.map((msg) => {
              const displayAuthor = getMessageDisplayAuthor(msg, 'user');
              const displayName = getMessageDisplayName(msg, 'user');
              
              return (
                <div
                  key={msg.id}
                  className={`flex ${displayAuthor.isModerator ? 'justify-start' : 'justify-end'}`}
                >
                  <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    displayAuthor.isModerator 
                      ? 'bg-gray-100 text-gray-900' 
                      : 'bg-blue-600 text-white'
                  }`}>
                    {displayAuthor.isModerator && (
                      <p className="text-xs font-medium mb-1 text-gray-600">
                        {displayName === 'System' ? 'System' : displayName}
                      </p>
                    )}
                    <p className="text-sm">{msg.content}</p>
                    <p className={`text-xs mt-1 ${
                      displayAuthor.isModerator ? 'text-gray-500' : 'text-blue-100'
                    }`}>
                      {formatTime(msg.timestamp)}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div className="p-4 border-t">
            {(sessionStatus === 'active' || sessionStatus === 'waiting') ? (
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder={sessionStatus === 'waiting' 
                    ? "Send a message while waiting..." 
                    : "Type your message..."}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                  disabled={!isConnected}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!message.trim() || !isConnected}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="text-center py-4">
                <MessageSquare className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500 mb-3">
                  {sessionStatus === 'closed'
                    ? 'This session has been closed.'
                    : 'Connecting to support...'}
                  {(satisfactionRating || session?.satisfactionRating) && (
                    <span className="block mt-2 text-sm font-medium text-green-600 bg-green-50 px-3 py-2 rounded-md">
                      Thank you for your feedback! {(satisfactionRating || session?.satisfactionRating) === 'thumbs_up' ? '👍 Positive' : '👎 Needs Improvement'}
                    </span>
                  )}
                </p>
                {sessionStatus === 'closed' && (
                  <button
                    onClick={handleStartNewSession}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Start New Session
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Satisfaction Rating Modal */}
        {showSatisfactionRating && sessionStatus === 'closed' && !satisfactionRating && !session?.satisfactionRating && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">How was your support experience?</h3>
              <p className="text-gray-600 mb-6">Your feedback helps us improve our support service.</p>
              
              <div className="flex space-x-4 justify-center">
                <button
                  onClick={() => handleSatisfactionRating('thumbs_up')}
                  className="flex flex-col items-center p-4 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors"
                >
                  <div className="text-3xl mb-2">👍</div>
                  <span className="text-sm font-medium text-gray-700">Good</span>
                </button>
                
                <button
                  onClick={() => handleSatisfactionRating('thumbs_down')}
                  className="flex flex-col items-center p-4 border-2 border-gray-200 rounded-lg hover:border-red-500 hover:bg-red-50 transition-colors"
                >
                  <div className="text-3xl mb-2">👎</div>
                  <span className="text-sm font-medium text-gray-700">Not Good</span>
                </button>
              </div>
              
              <button
                onClick={() => setShowSatisfactionRating(false)}
                className="mt-4 w-full text-sm text-gray-500 hover:text-gray-700"
              >
                Skip for now
              </button>
            </div>
          </div>
        )}

        {/* Help Text */}
        <div className="mt-6 bg-blue-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-900 mb-2">Tips for getting help:</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Be clear and specific about your issue</li>
            <li>• Include relevant details like error messages or screenshots</li>
            <li>• Be patient - our moderators will respond as soon as possible</li>
            <li>• Keep the conversation respectful and on-topic</li>
            <li>• You can open multiple support sessions in different tabs if needed</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
