import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, doc, addDoc, getDoc, getDocs, updateDoc, query, where, orderBy, Timestamp, deleteDoc, setDoc } from 'firebase/firestore';
import { User, ChatSession, Message, CreateUserData, CreateSessionData, CreateMessageData, ModeratorStats, GroupedSessions } from '@/types';

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

export class FirestoreService {
  // Collection references
  static get users() { return collection(db, 'users'); }
  static get sessions() { return collection(db, 'sessions'); }
  static get messages() { return collection(db, 'messages'); }
  static get config() { return collection(db, 'config'); }

  // Utility function to convert Firestore timestamp to Date
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static convertTimestamp(timestamp: any): Date {
    if (timestamp && typeof timestamp.toDate === 'function') {
      return timestamp.toDate();
    }
    if (timestamp instanceof Date) {
      return timestamp;
    }
    if (typeof timestamp === 'string') {
      return new Date(timestamp);
    }
    return new Date();
  }

  // User operations
  static async createUser(userData: CreateUserData): Promise<User> {
    // Check if user already exists
    const existingUser = await this.getUserByDiscordId(userData.discordId);
    if (existingUser) {
      return existingUser;
    }

    const now = Timestamp.now();
    // Remove undefined fields to avoid Firestore errors
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userDoc: any = {
      discordId: userData.discordId,
      username: userData.username,
      isModerator: userData.isModerator || false,
      createdAt: now,
      updatedAt: now,
    };

    // Only add avatar if it's defined
    if (userData.avatar !== undefined && userData.avatar !== null) {
      userDoc.avatar = userData.avatar;
    }

    const docRef = await addDoc(this.users, userDoc);
    
    return {
      id: docRef.id,
      ...userData,
      isModerator: userData.isModerator || false,
      createdAt: now.toDate(),
      updatedAt: now.toDate(),
    };
  }

  static async getUserById(id: string): Promise<User | null> {
    const docRef = doc(this.users, id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        discordId: data.discordId,
        username: data.username,
        avatar: data.avatar,
        isModerator: data.isModerator || false,
        createdAt: this.convertTimestamp(data.createdAt),
        updatedAt: this.convertTimestamp(data.updatedAt),
      };
    }
    
    return null;
  }

  static async getUserByDiscordId(discordId: string): Promise<User | null> {
    const q = query(this.users, where('discordId', '==', discordId));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      const data = doc.data();
      return {
        id: doc.id,
        discordId: data.discordId,
        username: data.username,
        avatar: data.avatar,
        isModerator: data.isModerator || false,
        createdAt: this.convertTimestamp(data.createdAt),
        updatedAt: this.convertTimestamp(data.updatedAt),
      };
    }
    
    return null;
  }

  static async getAllUsers(): Promise<User[]> {
    const querySnapshot = await getDocs(this.users);
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        discordId: data.discordId,
        username: data.username,
        avatar: data.avatar,
        isModerator: data.isModerator || false,
        createdAt: this.convertTimestamp(data.createdAt),
        updatedAt: this.convertTimestamp(data.updatedAt),
      };
    });
  }

  static async getModerators(): Promise<User[]> {
    const q = query(this.users, where('isModerator', '==', true));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        discordId: data.discordId,
        username: data.username,
        avatar: data.avatar,
        isModerator: data.isModerator || false,
        createdAt: this.convertTimestamp(data.createdAt),
        updatedAt: this.convertTimestamp(data.updatedAt),
      };
    });
  }

  static async getModeratorStats(moderatorId: string): Promise<ModeratorStats> {
    // Get sessions assigned to this moderator
    const sessionsQuery = query(this.sessions, where('assignedModerator', '==', moderatorId));
    const sessionsSnapshot = await getDocs(sessionsQuery);
    
    const sessions = sessionsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        status: data.status,
        satisfactionRating: data.satisfactionRating,
        createdAt: this.convertTimestamp(data.createdAt),
        updatedAt: this.convertTimestamp(data.updatedAt),
        lastActivity: this.convertTimestamp(data.lastActivity || data.updatedAt),
      };
    });

    const totalSessions = sessions.length;
    const activeSessions = sessions.filter(s => s.status === 'active').length;
    
    // Calculate sessions resolved today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const resolvedToday = sessions.filter(s => 
      s.status === 'closed' && 
      s.updatedAt >= today
    ).length;

    // Calculate satisfaction rate
    const sessionsWithRating = sessions.filter(s => s.satisfactionRating !== undefined);
    const positiveRatings = sessionsWithRating.filter(s => s.satisfactionRating === 'thumbs_up').length;
    const satisfactionRate = sessionsWithRating.length > 0 
      ? (positiveRatings / sessionsWithRating.length) * 100 
      : 0;

    return {
      totalSessions,
      activeSessions,
      resolvedToday,
      satisfactionRate,
    };
  }

  // Session operations
  static async createSession(sessionData: CreateSessionData): Promise<ChatSession> {
    const now = Timestamp.now();
    const sessionDoc = {
      userId: sessionData.userId,
      status: 'waiting' as const,
      assignedModerator: sessionData.assignedModerator || null,
      createdAt: now,
      updatedAt: now,
      lastActivity: now,
      closedAt: null,
      satisfactionRating: null,
    };

    const docRef = await addDoc(this.sessions, sessionDoc);
    
    // Get the user data
    const user = await this.getUserById(sessionData.userId);
    if (!user) {
      throw new Error('User not found');
    }

    return {
      id: docRef.id,
      userId: sessionData.userId,
      status: 'waiting',
      createdAt: now.toDate(),
      updatedAt: now.toDate(),
      lastActivity: now.toDate(),
      assignedModerator: sessionData.assignedModerator,
      closedAt: null,
      satisfactionRating: null,
      user,
      messages: [],
    };
  }

  static async getSessionById(id: string): Promise<ChatSession | null> {
    const docRef = doc(this.sessions, id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      const user = await this.getUserById(data.userId);
      const messages = await this.getMessagesBySessionId(id);
      
      if (!user) return null;

      return {
        id: docSnap.id,
        userId: data.userId,
        status: data.status,
        createdAt: this.convertTimestamp(data.createdAt),
        updatedAt: this.convertTimestamp(data.updatedAt),
        lastActivity: this.convertTimestamp(data.lastActivity),
        assignedModerator: data.assignedModerator,
        closedAt: data.closedAt ? this.convertTimestamp(data.closedAt) : null,
        satisfactionRating: data.satisfactionRating,
        isPinned: data.isPinned || false,
        pinnedBy: data.pinnedBy || null,
        pinnedAt: data.pinnedAt ? this.convertTimestamp(data.pinnedAt) : null,
        user,
        messages,
      };
    }
    
    return null;
  }

  static async getAllSessions(): Promise<ChatSession[]> {
    const q = query(this.sessions, orderBy('lastActivity', 'desc'));
    const querySnapshot = await getDocs(q);
    
    const sessions: ChatSession[] = [];
    
    for (const docSnap of querySnapshot.docs) {
      const data = docSnap.data();
      const user = await this.getUserById(data.userId);
      const messages = await this.getMessagesBySessionId(docSnap.id);
      
      if (user) {
        sessions.push({
          id: docSnap.id,
          userId: data.userId,
          status: data.status,
          createdAt: this.convertTimestamp(data.createdAt),
          updatedAt: this.convertTimestamp(data.updatedAt),
          lastActivity: this.convertTimestamp(data.lastActivity),
          assignedModerator: data.assignedModerator,
          closedAt: data.closedAt ? this.convertTimestamp(data.closedAt) : null,
          satisfactionRating: data.satisfactionRating,
          isPinned: data.isPinned || false,
          pinnedBy: data.pinnedBy || null,
          pinnedAt: data.pinnedAt ? this.convertTimestamp(data.pinnedAt) : null,
          user,
          messages,
        });
      }
    }
    
    return sessions;
  }

  static async updateSession(id: string, updates: Partial<{
    status: 'active' | 'closed' | 'waiting';
    assignedModerator: string;
    satisfactionRating: 'thumbs_up' | 'thumbs_down';
    isPinned: boolean;
    pinnedBy: string | null;
    pinnedAt: Date | null;
  }>): Promise<ChatSession | null> {
    const docRef = doc(this.sessions, id);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {
      ...updates,
      updatedAt: Timestamp.now(),
    };

    // Convert Date objects to Firestore Timestamps for pin-related fields
    if (updates.pinnedAt !== undefined) {
      updateData.pinnedAt = updates.pinnedAt ? Timestamp.fromDate(updates.pinnedAt) : null;
    }

    if (updates.status) {
      updateData.lastActivity = Timestamp.now();
      if (updates.status === 'closed') {
        updateData.closedAt = Timestamp.now();
      }
    }

    await updateDoc(docRef, updateData);
    return this.getSessionById(id);
  }

  static async getSessionsByUserId(userId: string): Promise<ChatSession[]> {
    const q = query(this.sessions, where('userId', '==', userId), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    const sessions: ChatSession[] = [];
    
    for (const docSnap of querySnapshot.docs) {
      const data = docSnap.data();
      const user = await this.getUserById(data.userId);
      const messages = await this.getMessagesBySessionId(docSnap.id);
      
      if (user) {
        sessions.push({
          id: docSnap.id,
          userId: data.userId,
          status: data.status,
          createdAt: this.convertTimestamp(data.createdAt),
          updatedAt: this.convertTimestamp(data.updatedAt),
          lastActivity: this.convertTimestamp(data.lastActivity),
          assignedModerator: data.assignedModerator,
          closedAt: data.closedAt ? this.convertTimestamp(data.closedAt) : null,
          satisfactionRating: data.satisfactionRating,
          isPinned: data.isPinned || false,
          pinnedBy: data.pinnedBy || null,
          pinnedAt: data.pinnedAt ? this.convertTimestamp(data.pinnedAt) : null,
          user,
          messages,
        });
      }
    }
    
    return sessions;
  }

  // Message operations
  static async createMessage(messageData: CreateMessageData): Promise<Message> {
    const now = Timestamp.now();
    // Remove undefined fields to avoid Firestore errors
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const messageDoc: any = {
      content: messageData.content,
      authorId: messageData.authorId,
      sessionId: messageData.sessionId,
      timestamp: now,
      isAnonymous: messageData.isAnonymous || false,
    };

    // Only add authorName if it's defined
    if (messageData.authorName !== undefined && messageData.authorName !== null) {
      messageDoc.authorName = messageData.authorName;
    }

    const docRef = await addDoc(this.messages, messageDoc);
    
    // Update session last activity
    const sessionRef = doc(this.sessions, messageData.sessionId);
    await updateDoc(sessionRef, {
      lastActivity: now,
      updatedAt: now,
    });

    // Get the author data
    const author = await this.getUserById(messageData.authorId);
    if (!author) {
      throw new Error('Author not found');
    }

    return {
      id: docRef.id,
      content: messageData.content,
      timestamp: now.toDate(),
      authorId: messageData.authorId,
      sessionId: messageData.sessionId,
      author,
      isAnonymous: messageData.isAnonymous || false,
    };
  }

  static async getMessagesBySessionId(sessionId: string): Promise<Message[]> {
    const q = query(this.messages, where('sessionId', '==', sessionId), orderBy('timestamp', 'asc'));
    const querySnapshot = await getDocs(q);
    
    const messages: Message[] = [];
    
    for (const docSnap of querySnapshot.docs) {
      const data = docSnap.data();
      const author = await this.getUserById(data.authorId);
      
      if (author) {
        messages.push({
          id: docSnap.id,
          content: data.content,
          timestamp: this.convertTimestamp(data.timestamp),
          authorId: data.authorId,
          sessionId: data.sessionId,
          author,
          isAnonymous: data.isAnonymous || false,
        });
      }
    }
    
    return messages;
  }

  // Stats operations
  static async getStats(): Promise<ModeratorStats> {
    const sessions = await this.getAllSessions();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const totalSessions = sessions.length;
    const activeSessions = sessions.filter(s => s.status === 'active').length;
    const resolvedToday = sessions.filter(s => 
      s.status === 'closed' && 
      s.closedAt && 
      new Date(s.closedAt) >= today
    ).length;

    // Calculate satisfaction rate
    const sessionsWithRating = sessions.filter(s => s.satisfactionRating);
    const positiveRatings = sessionsWithRating.filter(s => s.satisfactionRating === 'thumbs_up').length;
    const satisfactionRate = sessionsWithRating.length > 0 
      ? Math.round((positiveRatings / sessionsWithRating.length) * 100)
      : 0;

    return {
      totalSessions,
      activeSessions,
      resolvedToday,
      satisfactionRate,
    };
  }

  // Grouped sessions operations
  static async getGroupedSessions(includeAll: boolean = false): Promise<GroupedSessions[]> {
    const sessions = await this.getAllSessions();
    const filteredSessions = includeAll ? sessions : sessions.filter(s => s.status !== 'closed');
    
    // Group sessions by user
    const groupedMap = new Map<string, ChatSession[]>();
    
    for (const session of filteredSessions) {
      const userId = session.user.discordId;
      if (!groupedMap.has(userId)) {
        groupedMap.set(userId, []);
      }
      groupedMap.get(userId)!.push(session);
    }
    
    // Convert to GroupedSessions format
    const grouped: GroupedSessions[] = [];
    
    for (const [, userSessions] of groupedMap.entries()) {
      const user = userSessions[0].user;
      const sortedSessions = userSessions.sort((a, b) => 
        new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
      );
      
      const latestActivity = sortedSessions[0].lastActivity;
      const hasActiveSession = sortedSessions.some(s => s.status === 'active');
      const hasNewMessages = false; // This would need more complex logic to track "new" messages
      
      // Check if this is a guest user (sessions created without Discord auth)
      const isGuestUser = user.discordId.startsWith('guest_') || !user.discordId.match(/^\d+$/);
      
      grouped.push({
        user,
        sessions: sortedSessions,
        latestActivity,
        hasActiveSession,
        hasNewMessages,
        isGuestUser,
      });
    }
    
    // Sort groups by latest activity
    return grouped.sort((a, b) => 
      new Date(b.latestActivity).getTime() - new Date(a.latestActivity).getTime()
    );
  }

  // Utility method to get last updated timestamp
  static async getLastUpdated(): Promise<number> {
    // Get the most recent update from sessions or messages
    const sessionsQuery = query(this.sessions, orderBy('updatedAt', 'desc'));
    const messagesQuery = query(this.messages, orderBy('timestamp', 'desc'));
    
    const [sessionsSnapshot, messagesSnapshot] = await Promise.all([
      getDocs(sessionsQuery),
      getDocs(messagesQuery)
    ]);
    
    let lastUpdated = 0;
    
    if (!sessionsSnapshot.empty) {
      const latestSession = sessionsSnapshot.docs[0].data();
      const sessionTime = this.convertTimestamp(latestSession.updatedAt).getTime();
      lastUpdated = Math.max(lastUpdated, sessionTime);
    }
    
    if (!messagesSnapshot.empty) {
      const latestMessage = messagesSnapshot.docs[0].data();
      const messageTime = this.convertTimestamp(latestMessage.timestamp).getTime();
      lastUpdated = Math.max(lastUpdated, messageTime);
    }
    
    return lastUpdated;
  }

  // Update last updated timestamp to trigger SSE updates
  static async updateLastUpdated(): Promise<void> {
    try {
      // Update a meta document to trigger timestamp change
      const metaRef = doc(db, 'meta', 'lastUpdated');
      await setDoc(metaRef, {
        timestamp: Timestamp.now(),
        updated: new Date().toISOString()
      }, { merge: true });
    } catch (error) {
      console.error('Failed to update last updated timestamp:', error);
    }
  }

  // Cleanup method for development/testing
  static async clearAllData(): Promise<void> {
    console.warn('Clearing all Firestore data - this should only be used in development!');
    
    // Delete all messages
    const messagesSnapshot = await getDocs(this.messages);
    for (const doc of messagesSnapshot.docs) {
      await deleteDoc(doc.ref);
    }
    
    // Delete all sessions
    const sessionsSnapshot = await getDocs(this.sessions);
    for (const doc of sessionsSnapshot.docs) {
      await deleteDoc(doc.ref);
    }
    
    // Delete all users
    const usersSnapshot = await getDocs(this.users);
    for (const doc of usersSnapshot.docs) {
      await deleteDoc(doc.ref);
    }
  }

  // Configuration management
  static async getModeratorsConfig(): Promise<string[]> {
    try {
      const configDoc = await getDoc(doc(this.config, 'moderators'));
      if (configDoc.exists()) {
        const data = configDoc.data();
        return data.discordIds || [];
      }
      // If no config exists, fall back to environment variable
      return process.env.OWNERS?.split(',').filter(id => id.trim()) || [];
    } catch (error) {
      console.error('Error getting moderators config:', error);
      // Fall back to environment variable on error
      return process.env.OWNERS?.split(',').filter(id => id.trim()) || [];
    }
  }

  static async updateModeratorsConfig(discordIds: string[]): Promise<void> {
    const configDocRef = doc(this.config, 'moderators');
    await setDoc(configDocRef, {
      discordIds: discordIds.filter(id => id.trim()),
      updatedAt: Timestamp.now(),
      updatedBy: 'admin', // You could pass the admin user ID here
    }, { merge: true });
  }

  static async addModerator(discordId: string): Promise<string[]> {
    const currentModerators = await this.getModeratorsConfig();
    if (!currentModerators.includes(discordId)) {
      const newModerators = [...currentModerators, discordId];
      await this.updateModeratorsConfig(newModerators);
      
      // Update the user's isModerator status if they exist
      const user = await this.getUserByDiscordId(discordId);
      if (user) {
        const userDocRef = doc(this.users, user.id);
        await updateDoc(userDocRef, {
          isModerator: true,
          updatedAt: Timestamp.now(),
        });
      }
      
      return newModerators;
    }
    return currentModerators;
  }

  static async removeModerator(discordId: string): Promise<string[]> {
    const currentModerators = await this.getModeratorsConfig();
    const newModerators = currentModerators.filter(id => id !== discordId);
    await this.updateModeratorsConfig(newModerators);
    
    // Update the user's isModerator status if they exist
    const user = await this.getUserByDiscordId(discordId);
    if (user) {
      const userDocRef = doc(this.users, user.id);
      await updateDoc(userDocRef, {
        isModerator: false,
        updatedAt: Timestamp.now(),
      });
    }
    
    return newModerators;
  }

  static async isModerator(discordId: string): Promise<boolean> {
    const moderators = await this.getModeratorsConfig();
    return moderators.includes(discordId);
  }
}
