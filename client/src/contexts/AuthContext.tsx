// client/src/contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  User,
  register as registerUser,
  login as loginUser,
  loginWithGoogle,
  getCurrentUser,
  logout as logoutUser,
  isAuthenticated,
  getUser as getStoredUser,
  clearTokens,
  refreshAccessToken,
} from '../services/authService';
import { logger } from '../utils/logger';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  register: (email: string, password: string, name: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth state on mount (only runs once)
  useEffect(() => {
    let isMounted = true;
    
    const initializeAuth = async () => {
      try {
        // Small delay to ensure cookies are available after OAuth redirect
        // This is especially important for OAuth callbacks
        await new Promise(resolve => setTimeout(resolve, 100));

        // First, try to get user from server (works for both cookies and localStorage tokens)
        // This is the primary method - server reads from cookies or Authorization header
        try {
          const currentUser = await getCurrentUser();
          if (currentUser && isMounted) {
            logger.log('User found from server:', currentUser.email);
            setUser(currentUser);
            setIsLoading(false);
            return; // Success, exit early
          }
        } catch (error) {
          logger.log('No user from server, checking localStorage...', error);
        }

        // Fallback: Check if user is stored locally (for email/password login with localStorage)
        const storedUser = getStoredUser();
        if (storedUser && isAuthenticated()) {
          setUser(storedUser);
          
          // Verify with server and refresh token if needed
          try {
            const currentUser = await getCurrentUser();
            if (currentUser) {
              setUser(currentUser);
            } else {
              // Token invalid, try to refresh
              const newToken = await refreshAccessToken();
              if (newToken) {
                const refreshedUser = await getCurrentUser();
                if (refreshedUser) {
                  setUser(refreshedUser);
                } else {
                  clearTokens();
                  setUser(null);
                }
              } else {
                clearTokens();
                setUser(null);
              }
            }
          } catch (error) {
            logger.log('Error verifying user:', error);
            clearTokens();
            setUser(null);
          }
        } else {
          // No stored user and no server user - not logged in
          if (isMounted) {
            setUser(null);
          }
        }
      } catch (error) {
        logger.log('Error initializing auth:', error);
        if (isMounted) {
          clearTokens();
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initializeAuth();
    
    return () => {
      isMounted = false;
    };
  }, []);

  // Handle Google OAuth callback and URL cleanup
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('error');
    
    // If there's an error, show it and clean URL
    if (error) {
      console.error('OAuth error:', error);
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    // Clean URL if there were any params (but don't fetch user again - initializeAuth handles it)
    if (window.location.search && !error) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const register = useCallback(async (email: string, password: string, name: string) => {
    const response = await registerUser(email, password, name);
    if (response.success && response.data) {
      setUser(response.data.user);
    } else {
      throw new Error(response.message || 'Registration failed');
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await loginUser(email, password);
    if (response.success && response.data) {
      setUser(response.data.user);
    } else {
      throw new Error(response.message || 'Login failed');
    }
  }, []);

  const logout = useCallback(async () => {
    await logoutUser();
    setUser(null);
    // Clear session dismissal flag so login popup can show on next visit
    sessionStorage.removeItem('loginPopupDismissed');
    // Clear visit start time so timer resets
    localStorage.removeItem('siteVisitStartTime');
  }, []);

  const refreshUser = useCallback(async () => {
    const currentUser = await getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
    }
  }, []);

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    register,
    login,
    loginWithGoogle,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

