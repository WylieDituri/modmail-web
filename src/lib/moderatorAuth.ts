// Utility functions for moderator authentication

export interface ModeratorAuth {
  username: string;
  id: string;
  loginTime: number;
}

const AUTH_EXPIRY_HOURS = 8; // Session expires after 8 hours

export const getModeratorAuth = (): ModeratorAuth | null => {
  if (typeof window === 'undefined') return null;
  
  try {
    const authData = localStorage.getItem('moderator_auth');
    if (!authData) return null;
    
    const auth: ModeratorAuth = JSON.parse(authData);
    
    // Check if auth has expired
    const now = Date.now();
    const expiryTime = auth.loginTime + (AUTH_EXPIRY_HOURS * 60 * 60 * 1000);
    
    if (now > expiryTime) {
      // Auth expired, remove it
      localStorage.removeItem('moderator_auth');
      return null;
    }
    
    return auth;
  } catch (error) {
    console.error('Error reading moderator auth:', error);
    localStorage.removeItem('moderator_auth');
    return null;
  }
};

export const setModeratorAuth = (auth: ModeratorAuth): void => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem('moderator_auth', JSON.stringify(auth));
  } catch (error) {
    console.error('Error saving moderator auth:', error);
  }
};

export const clearModeratorAuth = (): void => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem('moderator_auth');
  } catch (error) {
    console.error('Error clearing moderator auth:', error);
  }
};

export const isModeratorAuthenticated = (): boolean => {
  return getModeratorAuth() !== null;
};
