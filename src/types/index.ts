export interface User {
  id: string;
  discordId: string;
  username: string;
  avatar?: string;
  isModerator: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface Message {
  id: string;
  content: string;
  timestamp: Date | string;
  authorId: string;
  sessionId: string;
  author: User;
  isAnonymous?: boolean; // For anonymous moderator messages
}

export interface ChatSession {
  id: string;
  userId: string;
  status: 'active' | 'closed' | 'waiting';
  createdAt: Date | string;
  updatedAt: Date | string;
  lastActivity: Date | string;
  assignedModerator?: string | null;
  closedAt?: Date | string | null;
  satisfactionRating?: 'thumbs_up' | 'thumbs_down' | null; // User satisfaction rating
  user: User;
  messages: Message[];
}

export interface ModeratorStats {
  totalSessions: number;
  activeSessions: number;
  resolvedToday: number;
  satisfactionRate: number; // Percentage of thumbs up ratings (0-100)
}

// Type for sending messages from client (without full author object)
export interface SendMessageData {
  content: string;
  authorId: string;
  sessionId: string;
  isAnonymous?: boolean;
}

export interface SocketEvents {
  // Client to Server
  'join-session': (sessionId: string) => void;
  'send-message': (message: SendMessageData) => void;
  'moderator-join': (moderatorId: string) => void;
  'close-session': (sessionId: string) => void;
  'update-satisfaction': (data: UpdateSessionSatisfactionData) => void;
  
  // Server to Client
  'message-received': (message: Message) => void;
  'session-updated': (session: ChatSession) => void;
  'moderator-joined': (moderatorId: string) => void;
  'session-closed': (sessionId: string) => void;
  'satisfaction-updated': (data: { sessionId: string; satisfactionRating: 'thumbs_up' | 'thumbs_down' }) => void;
  'error': (error: { message: string; code?: string }) => void;
}

// Database query types
export interface CreateUserData {
  discordId: string;
  username: string;
  avatar?: string;
  isModerator?: boolean;
}

export interface CreateSessionData {
  userId: string;
  assignedModerator?: string;
}

export interface UpdateSessionSatisfactionData {
  sessionId: string;
  satisfactionRating: 'thumbs_up' | 'thumbs_down';
}

export interface CreateMessageData {
  content: string;
  authorId: string;
  authorName?: string;
  sessionId: string;
  isAnonymous?: boolean; // For anonymous moderator messages
}

export interface GroupedSessions {
  user: User;
  sessions: ChatSession[];
  latestActivity: Date | string;
  hasActiveSession: boolean;
  hasNewMessages: boolean;
  isGuestUser?: boolean; // Added to distinguish guest users
}

// Utility types for anonymous moderator functionality
export interface AnonymousModeratorDisplay {
  id: 'anon-mod';
  username: 'Anon Mod';
  avatar?: string;
  isModerator: true;
}

export const ANONYMOUS_MODERATOR: AnonymousModeratorDisplay = {
  id: 'anon-mod',
  username: 'Anon Mod',
  isModerator: true
} as const;

// Helper function to get display author for messages
export function getMessageDisplayAuthor(message: Message, viewType: 'user' | 'moderator' = 'user'): User | AnonymousModeratorDisplay {
  // Safety check
  if (!message.author) {
    return ANONYMOUS_MODERATOR;
  }
  
  // For moderator view, always show the real author for logging/tracking
  if (viewType === 'moderator') {
    return message.author;
  }
  
  // For user view, show "Anon Mod" for anonymous moderator messages
  if (message.isAnonymous && message.author.isModerator) {
    return ANONYMOUS_MODERATOR;
  }
  
  return message.author;
}

// Helper function to get the display name for messages
export function getMessageDisplayName(message: Message, viewType: 'user' | 'moderator' = 'user'): string {
  // For moderator view of anonymous messages, show both real name and "(Anonymous)"
  if (viewType === 'moderator' && message.isAnonymous && message.author?.isModerator) {
    return `${message.author.username} (Anonymous)`;
  }
  
  const displayAuthor = getMessageDisplayAuthor(message, viewType);
  return displayAuthor.username;
}
