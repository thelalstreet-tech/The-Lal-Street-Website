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
        // Longer delay after OAuth redirect to ensure cookies are available
        // This is especially important for OAuth callbacks from Google
        // Check if we just came from OAuth (no error in URL but might be clean URL)
        const urlParams = new URLSearchParams(window.location.search);
        const hasOAuthParams = urlParams.has('code') || urlParams.has('state');
        const delay = hasOAuthParams ? 1000 : 100; // Longer delay for OAuth
        await new Promise(resolve => setTimeout(resolve, delay));

        // First, try to get user from server (works for both cookies and localStorage tokens)
        // This is the primary method - server reads from cookies or Authorization header
        try {
          const currentUser = await getCurrentUser();
          if (currentUser && isMounted) {
            logger.log('User found from server:', currentUser.email);
            // Use functional update to prevent unnecessary re-renders if user hasn't changed
            setUser(prevUser => {
              if (prevUser?.id === currentUser.id && prevUser?.email === currentUser.email) {
                return prevUser; // No change, prevent re-render
              }
              return currentUser;
            });
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
    const oauthSuccess = urlParams.get('oauth_success');
    const token = urlParams.get('token'); // Token passed in URL as fallback
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    
    // If there's an error, show it and clean URL
    if (error) {
      console.error('OAuth error:', error);
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    // Check for OAuth success - either explicit success param or code/state from Google
    const isOAuthCallback = oauthSuccess === 'true' || code || state;
    
    if (isOAuthCallback) {
      logger.log('OAuth callback detected:', { oauthSuccess, code: !!code, state: !!state, hasToken: !!token, tokenLength: token?.length });
      
      // If token is in URL (fallback for cross-domain cookie issues), store it temporarily
      if (token) {
        // Decode token in case it was URL encoded
        const decodedToken = decodeURIComponent(token);
        logger.log('Token found in URL, storing in localStorage...', { 
          originalLength: token.length, 
          decodedLength: decodedToken.length,
          tokenPreview: decodedToken.substring(0, 20) + '...' 
        });
        
        // Store token in localStorage as fallback - use the same key as TOKEN_KEY
        localStorage.setItem('accessToken', decodedToken);
        
        // Verify it was stored
        const storedToken = localStorage.getItem('accessToken');
        logger.log('Token stored, verification:', { 
          stored: !!storedToken, 
          storedLength: storedToken?.length,
          matches: storedToken === decodedToken,
          storedPreview: storedToken ? storedToken.substring(0, 20) + '...' : null
        });
        
        // Clean URL immediately to remove token
        window.history.replaceState({}, document.title, window.location.pathname);
        logger.log('URL cleaned, token removed from URL');
      } else {
        logger.log('⚠️ No token found in URL, will rely on cookies');
      }
      
      logger.log('Fetching user with credentials...');
      
      // Function to fetch user with retries
      const fetchUserWithRetry = async (attempt = 1, maxAttempts = 3) => {
        try {
          // Check if token is available before making request
          const tokenCheck = localStorage.getItem('accessToken');
          logger.log(`Attempt ${attempt} to fetch user...`, { 
            hasToken: !!tokenCheck, 
            tokenLength: tokenCheck?.length 
          });
          
          const currentUser = await getCurrentUser();
          if (currentUser) {
            logger.log('✅ User authenticated after OAuth callback:', currentUser.email);
            // Use functional update to prevent unnecessary re-renders
            setUser(prevUser => {
              // Only update if user actually changed to prevent flicker
              if (prevUser?.id !== currentUser.id || prevUser?.email !== currentUser.email) {
                return currentUser;
              }
              return prevUser;
            });
            setIsLoading(false);
            // Clean URL after successful fetch
            window.history.replaceState({}, document.title, window.location.pathname);
            return true;
          } else {
            logger.log(`⚠️ No user found on attempt ${attempt}`);
            if (attempt < maxAttempts) {
              // Retry with exponential backoff
              const delay = attempt * 1000; // 1s, 2s, 3s
              logger.log(`Retrying in ${delay}ms...`);
              setTimeout(() => fetchUserWithRetry(attempt + 1, maxAttempts), delay);
            } else {
              logger.log('❌ Failed to fetch user after all retries');
              setIsLoading(false);
              // Clean URL even on failure
              window.history.replaceState({}, document.title, window.location.pathname);
              return false;
            }
          }
        } catch (error) {
          logger.log(`Error on attempt ${attempt}:`, error);
          if (attempt < maxAttempts) {
            const delay = attempt * 1000;
            setTimeout(() => fetchUserWithRetry(attempt + 1, maxAttempts), delay);
          } else {
            logger.log('❌ Failed after all retries');
            setIsLoading(false);
            window.history.replaceState({}, document.title, window.location.pathname);
            return false;
          }
        }
      };
      
      // Start fetching user after a short delay to ensure token is stored
      setTimeout(() => fetchUserWithRetry(), 100);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

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

