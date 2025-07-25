import { useEffect, useState, useCallback, useRef } from 'react';
import { ChatSession, ModeratorStats, GroupedSessions, Message } from '@/types';

interface UseRealTimeDataOptions {
  authToken?: string;
  isAuthenticated: boolean;
  pollingInterval?: number;
}

interface RealTimeDataState {
  sessions: ChatSession[];
  groupedSessions: GroupedSessions[];
  stats: ModeratorStats;
  isLoading: boolean;
  lastUpdated: number;
}

interface OptimisticUpdate {
  id: string;
  type: 'pin' | 'unpin' | 'status' | 'message';
  sessionId: string;
  data: Partial<ChatSession>;
  timestamp: number;
  newMessage?: Message; // For message updates
}

export const useRealTimeData = ({ 
  isAuthenticated, 
  pollingInterval = 5000 
}: UseRealTimeDataOptions) => {
  const [state, setState] = useState<RealTimeDataState>({
    sessions: [],
    groupedSessions: [],
    stats: {
      totalSessions: 0,
      activeSessions: 0,
      resolvedToday: 0,
      satisfactionRate: 0
    },
    isLoading: true,
    lastUpdated: 0
  });

  const [optimisticUpdates, setOptimisticUpdates] = useState<OptimisticUpdate[]>([]);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdatedRef = useRef<number>(0);
  const isActiveRef = useRef<boolean>(true);

  // For deployment compatibility, we use polling only (no Socket.IO)
  const isConnected = false;

  // Check if tab is active/visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      isActiveRef.current = !document.hidden;
      // Tab visibility tracking for polling optimization
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Apply optimistic updates to sessions
  const applyOptimisticUpdates = useCallback((sessions: ChatSession[]) => {
    return sessions.map(session => {
      const updates = optimisticUpdates.filter(update => update.sessionId === session.id);
      if (updates.length === 0) return session;

      // Apply updates in chronological order
      return updates.reduce((acc, update) => {
        let updatedSession = { ...acc };

        // For pin/unpin updates, only apply if the current state doesn't already match
        if ((update.type === 'pin' || update.type === 'unpin') && update.data.isPinned !== undefined) {
          // Only apply optimistic pin update if the server data doesn't already reflect this change
          const serverStateMatches = acc.isPinned === update.data.isPinned;
          const updateIsRecent = Date.now() - update.timestamp < 5000; // Only apply recent updates
          
          if (!serverStateMatches && updateIsRecent) {
            updatedSession = {
              ...updatedSession,
              ...update.data
            };
          }
        }
        // For other updates (status, etc.)
        else if (update.type !== 'pin' && update.type !== 'unpin' && update.type !== 'message') {
          updatedSession = {
            ...updatedSession,
            ...update.data
          };
        }

        // Handle message updates specially
        if (update.type === 'message' && update.newMessage) {
          const newMessage = update.newMessage;
          const updateIsRecent = Date.now() - update.timestamp < 10000; // 10 seconds for messages
          
          if (updateIsRecent) {
            // Check if message already exists in the current session (more robust checking)
            const messageExists = updatedSession.messages.some(m => {
              // Check for exact ID match
              if (m.id === newMessage.id) return true;
              
              // Check for content/author/time match (in case server assigned new ID)
              const contentMatch = m.content.trim() === newMessage.content.trim();
              const authorMatch = m.authorId === newMessage.authorId;
              const timeMatch = Math.abs(new Date(m.timestamp).getTime() - new Date(newMessage.timestamp).getTime()) < 8000; // Within 8 seconds
              
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

        return updatedSession;
      }, session);
    });
  }, [optimisticUpdates]);

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

  const removeOptimisticUpdate = useCallback((updateId: string) => {
    setOptimisticUpdates(prev => prev.filter(update => update.id !== updateId));
  }, []);

  // Optimistic message update
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

  // Data fetching function
  const fetchData = useCallback(async () => {
    if (!isAuthenticated) {
      setState(prev => ({ ...prev, isLoading: false }));
      return;
    }

    try {
      // Check if data has been updated
      const lastUpdatedResponse = await fetch('/api/lastUpdated');
      if (!lastUpdatedResponse.ok) {
        throw new Error('Failed to check last updated');
      }

      const { lastUpdated } = await lastUpdatedResponse.json();
      
      // Only fetch if data has been updated or initial load
      const isInitialLoad = lastUpdatedRef.current === 0;
      const hasUpdates = lastUpdated > lastUpdatedRef.current;
      
      if (isInitialLoad || hasUpdates) {
        // Fetch data from server
        
        const [sessionsResponse, groupedResponse, statsResponse] = await Promise.all([
          fetch('/api/sessions?includeAll=true'),
          fetch('/api/sessions/grouped?includeAll=true'),
          fetch('/api/stats')
        ]);

        const [sessionsData, groupedData, statsData] = await Promise.all([
          sessionsResponse.ok ? sessionsResponse.json() : [],
          groupedResponse.ok ? groupedResponse.json() : [],
          statsResponse.ok ? statsResponse.json() : {
            totalSessions: 0,
            activeSessions: 0,
            resolvedToday: 0,
            satisfactionRate: 0
          }
        ]);

        setState(prev => ({
          ...prev,
          sessions: sessionsData,
          groupedSessions: groupedData,
          stats: statsData,
          isLoading: false,
          lastUpdated
        }));

        lastUpdatedRef.current = lastUpdated;
        // Data updated successfully
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [isAuthenticated]);

  // Set up adaptive polling
  useEffect(() => {
    if (!isAuthenticated) return;

    const setupPolling = () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }

      // Adaptive polling interval based on tab visibility
      const currentInterval = isActiveRef.current ? pollingInterval : pollingInterval * 3;

      // Set up polling interval
      pollingIntervalRef.current = setInterval(fetchData, currentInterval);
    };

    // Initial fetch
    fetchData();

    // Setup polling
    setupPolling();

    // Re-setup polling when visibility changes
    const handleVisibilityChange = () => {
      setupPolling();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isAuthenticated, fetchData, pollingInterval]);

  // Clean up optimistic updates when server state matches
  useEffect(() => {
    if (state.sessions.length === 0 || optimisticUpdates.length === 0) return;

    const updatesToRemove: string[] = [];

    optimisticUpdates.forEach(update => {
      const session = state.sessions.find(s => s.id === update.sessionId);
      if (!session) return;

      // For pin updates, only remove if the server state matches and the update is old enough
      if ((update.type === 'pin' || update.type === 'unpin') && update.data.isPinned !== undefined) {
        const serverMatches = session.isPinned === update.data.isPinned;
        const updateIsOldEnough = Date.now() - update.timestamp > 2000; // 2 seconds
        
        if (serverMatches && updateIsOldEnough) {
          updatesToRemove.push(update.id);
        }
      }

      // For message updates, only remove if message exists in server data and update is old enough
      if (update.type === 'message' && update.newMessage) {
        const updateIsOldEnough = Date.now() - update.timestamp > 3000; // 3 seconds for messages
        
        if (updateIsOldEnough) {
          const messageExists = session.messages.some(m => {
            // More precise matching: content, author, and reasonable time window
            const contentMatch = m.content.trim() === update.newMessage!.content.trim();
            const authorMatch = m.authorId === update.newMessage!.authorId;
            const timeWindow = Math.abs(new Date(m.timestamp).getTime() - new Date(update.newMessage!.timestamp).getTime()) < 15000; // 15 seconds
            
            // Also check for exact ID match
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
      // Remove optimistic updates
      setOptimisticUpdates(prev => prev.filter(update => !updatesToRemove.includes(update.id)));
    }
  }, [state.sessions, optimisticUpdates]);

  // Clean up old optimistic updates as fallback
  useEffect(() => {
    const cleanup = setInterval(() => {
      const now = Date.now();
      setOptimisticUpdates(prev => {
        const filtered = prev.filter(update => {
          const age = now - update.timestamp;
          // Remove pin updates older than 15 seconds
          if (update.type === 'pin' || update.type === 'unpin') {
            return age < 15000;
          }
          // Remove message updates older than 20 seconds
          if (update.type === 'message') {
            return age < 20000;
          }
          // Remove other updates older than 10 seconds
          return age < 10000;
        });
        
        if (filtered.length !== prev.length) {
          // Clean up old optimistic updates
        }
        
        return filtered;
      });
    }, 5000); // Check every 5 seconds

    return () => clearInterval(cleanup);
  }, []);

  // Apply optimistic updates to grouped sessions as well
  const applyOptimisticUpdatesGrouped = useCallback((groupedSessions: GroupedSessions[]) => {
    return groupedSessions.map(group => ({
      ...group,
      sessions: applyOptimisticUpdates(group.sessions)
    }));
  }, [applyOptimisticUpdates]);

  // Return state with optimistic updates applied
  return {
    ...state,
    sessions: applyOptimisticUpdates(state.sessions),
    groupedSessions: applyOptimisticUpdatesGrouped(state.groupedSessions),
    optimisticPinUpdate,
    optimisticMessageUpdate,
    removeOptimisticUpdate,
    isSocketConnected: isConnected,
    refetch: fetchData
  };
};
