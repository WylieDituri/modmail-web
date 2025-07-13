import { User, ChatSession, Message, CreateUserData, CreateSessionData, CreateMessageData } from '@/types';

// In-memory storage for server-side API routes
// Use global object to persist data during development (hot reloading)
const globalForMemoryStorage = globalThis as unknown as {
  memoryStorage: {
    users: User[];
    sessions: ChatSession[];
    messages: Message[];
    lastUpdated: number;
  };
};

if (!globalForMemoryStorage.memoryStorage) {
  globalForMemoryStorage.memoryStorage = {
    users: [],
    sessions: [],
    messages: [],
    lastUpdated: Date.now(),
  };
}

const { users, sessions, messages } = globalForMemoryStorage.memoryStorage;

// Helper function to update the last modified timestamp
function updateLastModified(): void {
  globalForMemoryStorage.memoryStorage.lastUpdated = Date.now();
}

// Helper function to generate unique IDs
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Helper function to calculate satisfaction rate as percentage
function calculateSatisfactionRate(sessionsList: ChatSession[]): number {
  const ratedSessions = sessionsList.filter(session => session.satisfactionRating);
  
  if (ratedSessions.length === 0) return 0;
  
  const thumbsUpCount = ratedSessions.filter(session => session.satisfactionRating === 'thumbs_up').length;
  const satisfactionRate = (thumbsUpCount / ratedSessions.length) * 100;
  
  return Math.round(satisfactionRate * 10) / 10; // Round to 1 decimal place
}

export class MemoryStorageService {
  // User operations
  static async createUser(data: CreateUserData): Promise<User> {
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
    updateLastModified();
    return user;
  }

  static async getUserById(id: string): Promise<User | null> {
    return users.find(user => user.id === id) || null;
  }

  static async getUserByDiscordId(discordId: string): Promise<User | null> {
    return users.find(user => user.discordId === discordId) || null;
  }

  static async updateUser(id: string, data: Partial<CreateUserData>): Promise<User> {
    const userIndex = users.findIndex(user => user.id === id);
    
    if (userIndex === -1) {
      throw new Error('User not found');
    }

    users[userIndex] = {
      ...users[userIndex],
      ...data,
      updatedAt: new Date(),
    };

    updateLastModified();
    return users[userIndex];
  }

  static async getModerators(): Promise<User[]> {
    return users.filter(user => user.isModerator);
  }

  static async getAllUsers(): Promise<User[]> {
    return users;
  }

  // Session operations
  static async createSession(data: CreateSessionData): Promise<ChatSession> {
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
    updateLastModified();
    return session;
  }

  static async getSessionById(id: string): Promise<ChatSession | null> {
    const session = sessions.find(s => s.id === id);
    
    if (!session) return null;

    // Get user and messages for the session
    const user = await this.getUserById(session.userId);
    const sessionMessages = await this.getMessagesBySessionId(id);
    
    return {
      ...session,
      user: user!,
      messages: sessionMessages,
    };
  }

  static async getActiveSessions(): Promise<ChatSession[]> {
    const activeSessions = sessions.filter(s => s.status === 'active' || s.status === 'waiting');
    
    // Populate user and messages for each session
    const populatedSessions = await Promise.all(
      activeSessions.map(async (session) => {
        const user = await this.getUserById(session.userId);
        const sessionMessages = await this.getMessagesBySessionId(session.id);
        return {
          ...session,
          user: user!,
          messages: sessionMessages,
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

    updateLastModified();
    // Return populated session
    return await this.getSessionById(id) as ChatSession;
  }

  static async updateSessionSatisfaction(sessionId: string, satisfactionRating: 'thumbs_up' | 'thumbs_down'): Promise<ChatSession | null> {
    const sessionIndex = sessions.findIndex(s => s.id === sessionId);
    
    if (sessionIndex === -1) return null;

    sessions[sessionIndex].satisfactionRating = satisfactionRating;
    sessions[sessionIndex].updatedAt = new Date();

    updateLastModified();
    
    return await this.getSessionById(sessionId);
  }

  static async getAllSessions(): Promise<ChatSession[]> {
    // Populate user and messages for all sessions
    const populatedSessions = await Promise.all(
      sessions.map(async (session) => {
        const user = await this.getUserById(session.userId);
        const sessionMessages = await this.getMessagesBySessionId(session.id);
        return {
          ...session,
          user: user!,
          messages: sessionMessages,
        };
      })
    );

    return populatedSessions.sort((a, b) => 
      new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
    );
  }

  // Message operations
  static async createMessage(data: CreateMessageData): Promise<Message> {
    let author = await this.getUserById(data.authorId);
    
    // Handle anonymous staff replies
    if (data.authorId === 'staff' && data.authorName === 'Staff') {
      author = {
        id: 'staff',
        discordId: 'staff',
        username: 'Staff',
        isModerator: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    } else if (!author) {
      throw new Error('Author not found');
    }

    // Override author username if authorName is provided
    if (data.authorName && author) {
      author = {
        ...author,
        username: data.authorName,
      };
    }

    const message: Message = {
      id: generateId(),
      content: data.content,
      timestamp: new Date(),
      authorId: data.authorId,
      sessionId: data.sessionId,
      author,
      isAnonymous: data.isAnonymous,
    };

    messages.push(message);

    // Update session last activity
    const sessionIndex = sessions.findIndex(s => s.id === data.sessionId);
    if (sessionIndex !== -1) {
      sessions[sessionIndex].lastActivity = new Date();
    }

    updateLastModified();
    return message;
  }

  static async getMessagesBySessionId(sessionId: string): Promise<Message[]> {
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

  // Statistics operations
  static async getModeratorStats(moderatorId: string) {
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
      satisfactionRate: calculateSatisfactionRate(moderatorSessions),
    };
  }

  static async getGlobalStats() {
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
      satisfactionRate: calculateSatisfactionRate(sessions),
    };
  }

  // Utility methods for development
  static clearAllData() {
    globalForMemoryStorage.memoryStorage.users = [];
    globalForMemoryStorage.memoryStorage.sessions = [];
    globalForMemoryStorage.memoryStorage.messages = [];
    updateLastModified();
    console.log('All data cleared from memory storage');
  }

  static getLastUpdated(): number {
    return globalForMemoryStorage.memoryStorage.lastUpdated;
  }
}
