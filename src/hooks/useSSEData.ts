import { useEffect, useState, useCallback, useRef } from 'react';
import { ChatSession, ModeratorStats, GroupedSessions, Message } from '@/types';

interface UseSSEDataOptions {
  isAuthenticated: boolean;
}

interface SSEDataState {
  sessions: ChatSession[];
  groupedSessions: GroupedSessions[];
  stats: ModeratorStats;
  isLoading: boolean;
  isConnected: boolean;
  lastUpdated: number;
  error: string | null;
}

interface OptimisticUpdate {
  id: string;
  type: 'pin' | 'unpin' | 'status' | 'message';
  sessionId: string;
  data: Partial<ChatSession>;
  timestamp: number;
  newMessage?: Message;
}

export const useSSEData = ({ 
  isAuthenticated
}: UseSSEDataOptions) => {
  const [state, setState] = useState<SSEDataState>({
    sessions: [],
    groupedSessions: [],
    stats: {
      totalSessions: 0,
      activeSessions: 0,
      resolvedToday: 0,
      satisfactionRate: 0
    },
    isLoading: true,
    isConnected: false,
    lastUpdated: 0,
    error: null
  });

  const [optimisticUpdates, setOptimisticUpdates] = useState<OptimisticUpdate[]>([]);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  // Apply optimistic updates to sessions
  const applyOptimisticUpdates = useCallback((sessions: ChatSession[]) => {
    return sessions.map(session => {
      const updates = optimisticUpdates.filter(update => update.sessionId === session.id);
      if (updates.length === 0) return session;

      return updates.reduce((acc, update) => {
        let updatedSession = { ...acc };

        // Handle pin/unpin updates
        if ((update.type === 'pin' || update.type === 'unpin') && update.data.isPinned !== undefined) {
          const serverStateMatches = acc.isPinned === update.data.isPinned;
          const updateIsRecent = Date.now() - update.timestamp < 5000;
          
          if (!serverStateMatches && updateIsRecent) {
            updatedSession = {
              ...updatedSession,
              ...update.data
            };
          }
        }
        // Handle message updates
        else if (update.type === 'message' && update.newMessage) {
          const newMessage = update.newMessage;
          const updateIsRecent = Date.now() - update.timestamp < 10000;
          
          if (updateIsRecent) {
            const messageExists = updatedSession.messages.some(m => {
              if (m.id === newMessage.id) return true;
              
              const contentMatch = m.content.trim() === newMessage.content.trim();
              const authorMatch = m.authorId === newMessage.authorId;
              const timeMatch = Math.abs(new Date(m.timestamp).getTime() - new Date(newMessage.timestamp).getTime()) < 8000;
              
              return contentMatch && authorMatch && timeMatch;
            });
            
            if (!messageExists) {
              updatedSession = {
                ...updatedSession,
                messages: [...updatedSession.messages, newMessage],
                status: 'active' as const,
                assignedModerator: update.data.assignedModerator || updatedSession.assignedModerator,
                lastActivity: new Date().toISOString()
              };
            }
          }
        }
        // Handle other updates
        else {
          updatedSession = {
            ...updatedSession,
            ...update.data
          };
        }

        return updatedSession;
      }, session);
    });
  }, [optimisticUpdates]);

  // Connect to SSE
  const connect = useCallback(() => {
    if (!isAuthenticated) {
      setState(prev => ({ ...prev, isLoading: false, error: 'Not authenticated' }));
      return;
    }

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    try {
      // Don't pass token in URL since it's in HTTP-only cookie
      const url = '/api/events';
      
      console.log('Connecting to SSE...');
      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log('SSE connected');
        setState(prev => ({ 
          ...prev, 
          isConnected: true, 
          error: null,
          isLoading: false  // Ensure loading is set to false on connection
        }));
        reconnectAttempts.current = 0;
      };

      eventSource.addEventListener('connected', (event) => {
        const data = JSON.parse(event.data);
        console.log('SSE connection established:', data.message);
      });

      eventSource.addEventListener('update', (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('SSE data update received:', {
            sessionsCount: data.sessions?.length || 0,
            groupedSessionsCount: data.groupedSessions?.length || 0,
            stats: data.stats,
            timestamp: data.timestamp
          });
          
          setState(prev => ({
            ...prev,
            sessions: data.sessions || prev.sessions,
            groupedSessions: data.groupedSessions || prev.groupedSessions,
            stats: data.stats || prev.stats,
            lastUpdated: data.timestamp || Date.now(),
            isLoading: false
          }));
        } catch (error) {
          console.error('Error parsing SSE update:', error);
        }
      });

      eventSource.addEventListener('heartbeat', (event) => {
        const data = JSON.parse(event.data);
        console.log('SSE heartbeat:', new Date(data.timestamp).toLocaleTimeString());
      });

      eventSource.onerror = (error) => {
        console.error('SSE connection error:', error);
        setState(prev => ({ 
          ...prev, 
          isConnected: false,
          error: 'Connection lost'
        }));

        eventSource.close();

        // Exponential backoff reconnection
        if (reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          console.log(`Reconnecting in ${delay}ms... (attempt ${reconnectAttempts.current + 1})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, delay);
        } else {
          setState(prev => ({ 
            ...prev, 
            error: 'Failed to reconnect. Please refresh the page.' 
          }));
        }
      };

    } catch (error) {
      console.error('Error creating SSE connection:', error);
      setState(prev => ({ 
        ...prev, 
        isConnected: false, 
        error: 'Failed to connect',
        isLoading: false
      }));
    }
  }, [isAuthenticated]);

  // Disconnect from SSE
  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    setState(prev => ({ ...prev, isConnected: false }));
  }, []);

  // Connect when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [isAuthenticated, connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  // Optimistic update functions
  const optimisticPinUpdate = useCallback((sessionId: string, isPinned: boolean, pinnedBy?: string) => {
    const updateId = `pin-${sessionId}-${Date.now()}`;
    const optimisticUpdate: OptimisticUpdate = {
      id: updateId,
      type: isPinned ? 'pin' : 'unpin',
      sessionId,
      data: {
        isPinned,
        pinnedBy: isPinned ? pinnedBy : null,
        pinnedAt: isPinned ? new Date().toISOString() : null
      },
      timestamp: Date.now()
    };

    setOptimisticUpdates(prev => [...prev, optimisticUpdate]);
    return updateId;
  }, []);

  const optimisticMessageUpdate = useCallback((sessionId: string, newMessage: Message, assignedModerator?: string) => {
    const updateId = `message-${sessionId}-${Date.now()}`;
    const optimisticUpdate: OptimisticUpdate = {
      id: updateId,
      type: 'message',
      sessionId,
      data: {
        status: 'active' as const,
        assignedModerator,
        lastActivity: new Date().toISOString()
      },
      timestamp: Date.now(),
      newMessage
    };

    setOptimisticUpdates(prev => [...prev, optimisticUpdate]);
    return updateId;
  }, []);

  const removeOptimisticUpdate = useCallback((updateId: string) => {
    setOptimisticUpdates(prev => prev.filter(update => update.id !== updateId));
  }, []);

  // Clean up optimistic updates when server state matches
  useEffect(() => {
    if (state.sessions.length === 0 || optimisticUpdates.length === 0) return;

    const updatesToRemove: string[] = [];

    optimisticUpdates.forEach(update => {
      const session = state.sessions.find(s => s.id === update.sessionId);
      if (!session) return;

      // For pin updates
      if ((update.type === 'pin' || update.type === 'unpin') && update.data.isPinned !== undefined) {
        const serverMatches = session.isPinned === update.data.isPinned;
        const updateIsOldEnough = Date.now() - update.timestamp > 2000;
        
        if (serverMatches && updateIsOldEnough) {
          updatesToRemove.push(update.id);
        }
      }

      // For message updates
      if (update.type === 'message' && update.newMessage) {
        const updateIsOldEnough = Date.now() - update.timestamp > 3000;
        
        if (updateIsOldEnough) {
          const messageExists = session.messages.some(m => {
            const contentMatch = m.content.trim() === update.newMessage!.content.trim();
            const authorMatch = m.authorId === update.newMessage!.authorId;
            const timeWindow = Math.abs(new Date(m.timestamp).getTime() - new Date(update.newMessage!.timestamp).getTime()) < 15000;
            const idMatch = m.id === update.newMessage!.id;
            
            return idMatch || (contentMatch && authorMatch && timeWindow);
          });
          
          if (messageExists) {
            updatesToRemove.push(update.id);
          }
        }
      }
    });

    if (updatesToRemove.length > 0) {
      setOptimisticUpdates(prev => prev.filter(update => !updatesToRemove.includes(update.id)));
    }
  }, [state.sessions, optimisticUpdates]);

  // Clean up old optimistic updates
  useEffect(() => {
    const cleanup = setInterval(() => {
      const now = Date.now();
      setOptimisticUpdates(prev => {
        const filtered = prev.filter(update => {
          const age = now - update.timestamp;
          if (update.type === 'pin' || update.type === 'unpin') {
            return age < 15000;
          }
          if (update.type === 'message') {
            return age < 20000;
          }
          return age < 10000;
        });
        
        return filtered;
      });
    }, 5000);

    return () => clearInterval(cleanup);
  }, []);

  // Apply optimistic updates to grouped sessions
  const applyOptimisticUpdatesGrouped = useCallback((groupedSessions: GroupedSessions[]) => {
    return groupedSessions.map(group => ({
      ...group,
      sessions: applyOptimisticUpdates(group.sessions)
    }));
  }, [applyOptimisticUpdates]);

  return {
    ...state,
    sessions: applyOptimisticUpdates(state.sessions),
    groupedSessions: applyOptimisticUpdatesGrouped(state.groupedSessions),
    optimisticPinUpdate,
    optimisticMessageUpdate,
    removeOptimisticUpdate,
    isSocketConnected: state.isConnected,
    reconnect: connect,
    disconnect
  };
};
