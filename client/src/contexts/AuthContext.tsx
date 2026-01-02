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
      const DEBUG = true;
      const logPrefix = '[AuthContext:initializeAuth]';
      
      try {
        if (DEBUG) console.log(`${logPrefix} Starting auth initialization...`);
        
        // Longer delay for cold starts on Render free tier (can take 30s+)
        // Also ensures cookies are available after OAuth redirect
        await new Promise(resolve => setTimeout(resolve, 500));
        
        if (DEBUG) {
          // Check cookies (can't read httpOnly, but we can check if cookie header would be sent)
          console.log(`${logPrefix} Checking authentication state...`);
          console.log(`${logPrefix} localStorage token:`, localStorage.getItem('accessToken') ? 'exists' : 'none');
          console.log(`${logPrefix} localStorage user:`, localStorage.getItem('user') ? 'exists' : 'none');
        }

        // First, try to get user from server (works for both cookies and localStorage tokens)
        // This is the primary method - server reads from cookies or Authorization header
        // getCurrentUser now has built-in retry logic for cold starts
        try {
          if (DEBUG) console.log(`${logPrefix} Attempting getCurrentUser(0)...`);
          const currentUser = await getCurrentUser(0);
          if (currentUser && isMounted) {
            logger.log(`${logPrefix} ✅ User found from server:`, currentUser.email);
            setUser(currentUser);
            setIsLoading(false);
            return; // Success, exit early
          } else {
            if (DEBUG) console.log(`${logPrefix} No user from server (currentUser: ${currentUser})`);
          }
        } catch (error) {
          logger.log(`${logPrefix} Error getting user from server:`, error);
        }

        // Fallback: Check if user is stored locally (for email/password login with localStorage)
        const storedUser = getStoredUser();
        if (DEBUG) {
          console.log(`${logPrefix} Stored user check:`, {
            hasStoredUser: !!storedUser,
            isAuthenticated: isAuthenticated(),
            storedUserEmail: storedUser?.email
          });
        }
        
        if (storedUser && isAuthenticated()) {
          if (DEBUG) console.log(`${logPrefix} Found stored user, verifying with server...`);
          setUser(storedUser);
          
          // Verify with server and refresh token if needed
          // Use retry count to avoid clearing tokens on cold start
          try {
            const currentUser = await getCurrentUser(1);
            if (currentUser) {
              if (DEBUG) console.log(`${logPrefix} ✅ Verified stored user with server:`, currentUser.email);
              setUser(currentUser);
            } else {
              if (DEBUG) console.log(`${logPrefix} Stored user verification failed, trying token refresh...`);
              // Token might be invalid, or server might be cold starting
              // Try to refresh token (has retry logic built-in)
              const newToken = await refreshAccessToken();
              if (newToken) {
                if (DEBUG) console.log(`${logPrefix} Token refreshed, retrying getCurrentUser...`);
                const refreshedUser = await getCurrentUser(2);
                if (refreshedUser) {
                  if (DEBUG) console.log(`${logPrefix} ✅ Success after refresh:`, refreshedUser.email);
                  setUser(refreshedUser);
                } else {
                  if (DEBUG) console.log(`${logPrefix} ❌ Failed after refresh, clearing tokens`);
                  // Only clear after multiple failed attempts (not cold start)
                  clearTokens();
                  setUser(null);
                }
              } else {
                if (DEBUG) console.log(`${logPrefix} Token refresh failed, keeping stored user for now`);
                // Refresh failed - might be cold start, don't clear immediately
                // Will be cleared on next attempt if still failing
                setUser(null);
              }
            }
          } catch (error) {
            logger.log(`${logPrefix} Error verifying user:`, error);
            // Don't clear tokens on error - might be network/cold start issue
            setUser(null);
          }
        } else {
          // No stored user and no server user - not logged in
          if (DEBUG) console.log(`${logPrefix} No stored user, user is not authenticated`);
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
  }, []);

  const refreshUser = useCallback(async () => {
    const currentUser = await getCurrentUser(0);
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

