import { User, ChatSession, Message, CreateUserData, CreateSessionData, CreateMessageData } from '@/types';

// Local storage keys
const STORAGE_KEYS = {
  USERS: 'modmail_users',
  SESSIONS: 'modmail_sessions',
  MESSAGES: 'modmail_messages',
  STATS: 'modmail_stats'
};

// Helper function to generate unique IDs
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Helper functions for localStorage
function getFromStorage<T>(key: string): T[] {
  if (typeof window === 'undefined') {
    // Return empty array for server-side rendering
    return [];
  }
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error reading from localStorage:', error);
    return [];
  }
}

function saveToStorage<T>(key: string, data: T[]): void {
  if (typeof window === 'undefined') {
    // Don't save on server-side
    return;
  }
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
}

export class LocalStorageService {
  // User operations
  static async createUser(data: CreateUserData): Promise<User> {
    const users = getFromStorage<User>(STORAGE_KEYS.USERS);
    const user: User = {
      id: generateId(),
      discordId: data.discordId,
      username: data.username,
      avatar: data.avatar,
      isModerator: data.isModerator || false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    users.push(user);
    saveToStorage(STORAGE_KEYS.USERS, users);
    return user;
  }

  static async getUserById(id: string): Promise<User | null> {
    const users = getFromStorage<User>(STORAGE_KEYS.USERS);
    return users.find(user => user.id === id) || null;
  }

  static async getUserByDiscordId(discordId: string): Promise<User | null> {
    const users = getFromStorage<User>(STORAGE_KEYS.USERS);
    return users.find(user => user.discordId === discordId) || null;
  }

  static async updateUser(id: string, data: Partial<CreateUserData>): Promise<User> {
    const users = getFromStorage<User>(STORAGE_KEYS.USERS);
    const userIndex = users.findIndex(user => user.id === id);
    
    if (userIndex === -1) {
      throw new Error('User not found');
    }

    users[userIndex] = {
      ...users[userIndex],
      ...data,
      updatedAt: new Date(),
    };

    saveToStorage(STORAGE_KEYS.USERS, users);
    return users[userIndex];
  }

  static async getModerators(): Promise<User[]> {
    const users = getFromStorage<User>(STORAGE_KEYS.USERS);
    return users.filter(user => user.isModerator);
  }

  // Session operations
  static async createSession(data: CreateSessionData): Promise<ChatSession> {
    const sessions = getFromStorage<ChatSession>(STORAGE_KEYS.SESSIONS);
    const user = await this.getUserById(data.userId);
    
    if (!user) {
      throw new Error('User not found');
    }

    const session: ChatSession = {
      id: generateId(),
      userId: data.userId,
      status: 'waiting',
      createdAt: new Date(),
      updatedAt: new Date(),
      lastActivity: new Date(),
      assignedModerator: data.assignedModerator,
      user,
      messages: [],
    };

    sessions.push(session);
    saveToStorage(STORAGE_KEYS.SESSIONS, sessions);
    return session;
  }

  static async getSessionById(id: string): Promise<ChatSession | null> {
    const sessions = getFromStorage<ChatSession>(STORAGE_KEYS.SESSIONS);
    const session = sessions.find(s => s.id === id);
    
    if (!session) return null;

    // Get user and messages for the session
    const user = await this.getUserById(session.userId);
    const messages = await this.getMessagesBySessionId(id);
    
    return {
      ...session,
      user: user!,
      messages,
    };
  }

  static async getActiveSessions(): Promise<ChatSession[]> {
    const sessions = getFromStorage<ChatSession>(STORAGE_KEYS.SESSIONS);
    const activeSessions = sessions.filter(s => s.status === 'active' || s.status === 'waiting');
    
    // Populate user and messages for each session
    const populatedSessions = await Promise.all(
      activeSessions.map(async (session) => {
        const user = await this.getUserById(session.userId);
        const messages = await this.getMessagesBySessionId(session.id);
        return {
          ...session,
          user: user!,
          messages,
        };
      })
    );

    return populatedSessions.sort((a, b) => 
      new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
    );
  }

  static async updateSessionStatus(
    id: string,
    status: 'active' | 'closed' | 'waiting',
    moderatorId?: string
  ): Promise<ChatSession> {
    const sessions = getFromStorage<ChatSession>(STORAGE_KEYS.SESSIONS);
    const sessionIndex = sessions.findIndex(s => s.id === id);
    
    if (sessionIndex === -1) {
      throw new Error('Session not found');
    }

    sessions[sessionIndex] = {
      ...sessions[sessionIndex],
      status,
      assignedModerator: moderatorId,
      lastActivity: new Date(),
      updatedAt: new Date(),
      closedAt: status === 'closed' ? new Date() : sessions[sessionIndex].closedAt,
    };

    saveToStorage(STORAGE_KEYS.SESSIONS, sessions);
    
    // Return populated session
    return await this.getSessionById(id) as ChatSession;
  }

  // Message operations
  static async createMessage(data: CreateMessageData): Promise<Message> {
    const messages = getFromStorage<Message>(STORAGE_KEYS.MESSAGES);
    const author = await this.getUserById(data.authorId);
    
    if (!author) {
      throw new Error('Author not found');
    }

    const message: Message = {
      id: generateId(),
      content: data.content,
      timestamp: new Date(),
      authorId: data.authorId,
      sessionId: data.sessionId,
      author,
    };

    messages.push(message);
    saveToStorage(STORAGE_KEYS.MESSAGES, messages);

    // Update session last activity
    const sessions = getFromStorage<ChatSession>(STORAGE_KEYS.SESSIONS);
    const sessionIndex = sessions.findIndex(s => s.id === data.sessionId);
    if (sessionIndex !== -1) {
      sessions[sessionIndex].lastActivity = new Date();
      saveToStorage(STORAGE_KEYS.SESSIONS, sessions);
    }

    return message;
  }

  static async getMessagesBySessionId(sessionId: string): Promise<Message[]> {
    const messages = getFromStorage<Message>(STORAGE_KEYS.MESSAGES);
    const sessionMessages = messages.filter(m => m.sessionId === sessionId);
    
    // Populate author for each message
    const populatedMessages = await Promise.all(
      sessionMessages.map(async (message) => {
        const author = await this.getUserById(message.authorId);
        return {
          ...message,
          author: author!,
        };
      })
    );

    return populatedMessages.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }

  // Helper function to calculate average response time in minutes
  static async calculateAverageResponseTime(sessionsList: ChatSession[]): Promise<number> {
    const responseTimes: number[] = [];
    
    for (const session of sessionsList) {
      const sessionMessages = await this.getMessagesBySessionId(session.id);
      
      if (sessionMessages.length === 0) continue;
      
      // Find the first user message (non-moderator)
      const firstUserMessage = sessionMessages.find(m => !m.author.isModerator);
      if (!firstUserMessage) continue;
      
      // Find the first moderator response after the user message
      const firstModeratorResponse = sessionMessages.find(m => 
        m.author.isModerator && 
        new Date(m.timestamp) > new Date(firstUserMessage.timestamp)
      );
      
      if (firstModeratorResponse) {
        const responseTime = new Date(firstModeratorResponse.timestamp).getTime() - 
                            new Date(firstUserMessage.timestamp).getTime();
        const responseTimeInMinutes = responseTime / (1000 * 60); // Convert to minutes
        responseTimes.push(responseTimeInMinutes);
      }
    }
    
    if (responseTimes.length === 0) return 0;
    
    const average = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
    return Math.round(average * 10) / 10; // Round to 1 decimal place
  }

  // Statistics operations
  static async getModeratorStats(moderatorId: string) {
    const sessions = getFromStorage<ChatSession>(STORAGE_KEYS.SESSIONS);
    const moderatorSessions = sessions.filter(s => s.assignedModerator === moderatorId);
    
    const totalSessions = moderatorSessions.length;
    const activeSessions = moderatorSessions.filter(s => s.status === 'active').length;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const resolvedToday = moderatorSessions.filter(s => 
      s.status === 'closed' && 
      s.closedAt && 
      new Date(s.closedAt) >= today
    ).length;

    return {
      totalSessions,
      activeSessions,
      resolvedToday,
      averageResponseTime: await this.calculateAverageResponseTime(moderatorSessions),
    };
  }

  static async getGlobalStats() {
    const sessions = getFromStorage<ChatSession>(STORAGE_KEYS.SESSIONS);
    
    const totalSessions = sessions.length;
    const activeSessions = sessions.filter(s => s.status === 'active').length;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const resolvedToday = sessions.filter(s => 
      s.status === 'closed' && 
      s.closedAt && 
      new Date(s.closedAt) >= today
    ).length;

    return {
      totalSessions,
      activeSessions,
      resolvedToday,
      averageResponseTime: await this.calculateAverageResponseTime(sessions),
    };
  }

  // Utility methods for development
  static clearAllData() {
    if (typeof window !== 'undefined') {
      Object.values(STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
      });
      console.log('All data cleared from localStorage');
    }
  }
}
