import React, { createContext, useContext, useEffect, useState } from 'react';
import { sessionService, User } from '@/services/sessionService';

interface SessionContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  getCurrentUserId: () => string;
  getCurrentUserName: () => string;
  getUserRole: () => string;
  getUserOfficeId: () => number;
  getUserWingId: () => number;
  initializeSession: () => Promise<void>;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const initializeSession = async () => {
    try {
      setIsLoading(true);
      const sessionUser = await sessionService.initializeSession();
      setUser(sessionUser);
      
      // Debug logging
      } catch (error) {
      console.error('Failed to initialize session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    initializeSession();
  }, []);

  const contextValue: SessionContextType = {
    user,
    isLoading,
    isAuthenticated: user !== null,
    getCurrentUserId: () => sessionService.getCurrentUserId(),
    getCurrentUserName: () => sessionService.getCurrentUserName(),
    getUserRole: () => sessionService.getUserRole(),
    getUserOfficeId: () => sessionService.getUserOfficeId(),
    getUserWingId: () => sessionService.getUserWingId(),
    initializeSession,
  };

  return (
    <SessionContext.Provider value={contextValue}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = (): SessionContextType => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
};
