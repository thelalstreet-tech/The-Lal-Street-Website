// client/src/services/authService.ts
import { API_BASE_URL } from '../config/api';

export interface User {
  id: string;
  email: string;
  name: string;
  picture: string | null;
  authProvider: 'google' | 'email';
  lastLoginAt?: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  data?: {
    user: User;
    accessToken: string;
    refreshToken: string;
  };
}

const TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const USER_KEY = 'user';

/**
 * Store tokens in localStorage
 */
export const setTokens = (accessToken: string, refreshToken: string) => {
  localStorage.setItem(TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
};

/**
 * Get access token from localStorage or cookie
 * Note: httpOnly cookies can't be read by JavaScript, so we rely on backend
 * to read cookies and validate. For API calls, we don't send token in header
 * if using cookies (backend reads from cookies automatically).
 */
export const getAccessToken = (): string | null => {
  // Try localStorage first (for email/password login)
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) return token;
  
  // If no localStorage token, assume cookies are being used (set by backend)
  // Return null - backend will read from cookies
  return null;
};

/**
 * Get refresh token from localStorage
 */
export const getRefreshToken = (): string | null => {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
};

/**
 * Clear all tokens
 */
export const clearTokens = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

/**
 * Store user in localStorage
 */
export const setUser = (user: User) => {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

/**
 * Get user from localStorage
 */
export const getUser = (): User | null => {
  const userStr = localStorage.getItem(USER_KEY);
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
};

/**
 * Register new user
 */
export const register = async (email: string, password: string, name: string): Promise<AuthResponse> => {
  const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password, name }),
  });

  const data = await response.json();
  
  if (data.success && data.data) {
    setTokens(data.data.accessToken, data.data.refreshToken);
    setUser(data.data.user);
  }

  return data;
};

/**
 * Login with email/password
 */
export const login = async (email: string, password: string): Promise<AuthResponse> => {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();
  
  if (data.success && data.data) {
    setTokens(data.data.accessToken, data.data.refreshToken);
    setUser(data.data.user);
  }

  return data;
};

/**
 * Login with Google (redirects to Google OAuth)
 */
export const loginWithGoogle = () => {
  window.location.href = `${API_BASE_URL}/api/auth/google`;
};

/**
 * Refresh access token
 * Backend can read refreshToken from httpOnly cookie, but we also support
 * sending it in body for localStorage-based auth
 * Includes retry logic for cold starts
 */
export const refreshAccessToken = async (): Promise<string | null> => {
  const refreshToken = getRefreshToken();
  
  try {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    const body: any = {};
    
    // If we have refreshToken in localStorage, send it in body
    // Otherwise, backend will read from httpOnly cookie
    if (refreshToken) {
      body.refreshToken = refreshToken;
    }

    // Use retry logic for cold starts
    const response = await fetchWithRetry(
      `${API_BASE_URL}/api/auth/refresh`,
      {
        method: 'POST',
        headers,
        credentials: 'include', // Important: sends cookies
        body: Object.keys(body).length > 0 ? JSON.stringify(body) : undefined,
      },
      3, // max retries
      2000 // initial delay 2s
    );

    const data = await response.json();
    
    if (data.success && data.data?.accessToken) {
      // Store in localStorage if provided (for email/password login)
      // If using cookies, backend sets it in cookie automatically
      if (data.data.accessToken) {
        localStorage.setItem(TOKEN_KEY, data.data.accessToken);
        return data.data.accessToken;
      }
    }

    return null;
  } catch (error) {
    console.error('Error refreshing token:', error);
    return null;
  }
};

/**
 * Retry fetch with exponential backoff (for cold starts on Render)
 */
const fetchWithRetry = async (
  url: string,
  options: RequestInit,
  maxRetries = 3,
  initialDelay = 1000
): Promise<Response> => {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      
      // If successful or not a network/server error, return immediately
      if (response.ok || (response.status !== 0 && response.status < 500)) {
        return response;
      }
      
      // If it's the last attempt, return the response anyway
      if (attempt === maxRetries - 1) {
        return response;
      }
      
      // Wait with exponential backoff before retrying
      const delay = initialDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    } catch (error) {
      // If it's the last attempt, throw the error
      if (attempt === maxRetries - 1) {
        throw error;
      }
      
      // Wait with exponential backoff before retrying
      const delay = initialDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // Fallback (shouldn't reach here)
  return fetch(url, options);
};

/**
 * Get current user from server
 * Backend reads tokens from httpOnly cookies automatically
 * Includes retry logic for Render cold starts
 */
export const getCurrentUser = async (retryCount = 0): Promise<User | null> => {
  const DEBUG = true; // Enable detailed logging
  const logPrefix = `[getCurrentUser:${retryCount}]`;
  
  try {
    // IMPORTANT: Don't send Authorization header if we're using cookies (Google OAuth)
    // The backend middleware checks cookies first, but if we send an expired token
    // in Authorization header, it might cause issues. Let cookies take precedence.
    const token = getAccessToken();
    const headers: HeadersInit = {};
    
    // Only send Authorization header if:
    // 1. We have a token in localStorage (email/password login)
    // 2. AND we don't have cookies (cookies take precedence for Google OAuth)
    // For Google OAuth, cookies are set by backend, so we rely on those
    if (token) {
      // Check if we're likely using cookies (Google OAuth) by checking if token is recent
      // If token exists but we're getting 401s, it might be expired - don't send it
      // Let cookies handle it instead
      if (DEBUG) {
        console.log(`${logPrefix} Found localStorage token (length: ${token.length})`);
        console.log(`${logPrefix} Will send Authorization header, but cookies will take precedence on backend`);
      }
      headers['Authorization'] = `Bearer ${token}`;
    } else {
      if (DEBUG) console.log(`${logPrefix} No localStorage token, relying on httpOnly cookies only`);
    }
    
    // Check if cookies are available (can't read httpOnly cookies, but we can check if they exist)
    if (DEBUG) {
      console.log(`${logPrefix} Making request to: ${API_BASE_URL}/api/auth/me`);
      console.log(`${logPrefix} Request config:`, {
        hasAuthHeader: !!headers['Authorization'],
        credentials: 'include',
        method: 'GET',
        url: `${API_BASE_URL}/api/auth/me`
      });
    }

    // Use retry logic for cold starts (especially on Render free tier)
    const startTime = Date.now();
    const response = await fetchWithRetry(
      `${API_BASE_URL}/api/auth/me`,
      {
        headers,
        credentials: 'include', // Important: sends cookies with request
      },
      3, // max retries
      2000 // initial delay 2s (cold starts can take 30s+)
    );
    const duration = Date.now() - startTime;

    if (DEBUG) {
      console.log(`${logPrefix} Response received:`, {
        status: response.status,
        statusText: response.statusText,
        duration: `${duration}ms`,
        headers: Object.fromEntries(response.headers.entries())
      });
    }

    if (response.status === 401) {
      if (DEBUG) console.log(`${logPrefix} Got 401, attempting token refresh...`);
      // Don't immediately clear tokens - might be cold start
      // Try to refresh token first
      const newToken = await refreshAccessToken();
      if (newToken) {
        if (DEBUG) console.log(`${logPrefix} Token refreshed, retrying auth/me...`);
        // Retry with new token
        const retryResponse = await fetchWithRetry(
          `${API_BASE_URL}/api/auth/me`,
          {
            headers: {
              'Authorization': `Bearer ${newToken}`,
            },
            credentials: 'include',
          },
          2, // fewer retries for refresh
          1000
        );
        if (DEBUG) {
          console.log(`${logPrefix} Retry response:`, {
            status: retryResponse.status,
            ok: retryResponse.ok
          });
        }
        if (retryResponse.ok) {
          const retryData = await retryResponse.json();
          if (retryData.success && retryData.data?.user) {
            if (DEBUG) console.log(`${logPrefix} Success after refresh:`, retryData.data.user.email);
            // Store user in localStorage for consistency
            setUser(retryData.data.user);
            return retryData.data.user;
          }
        } else {
          // Try to get error details
          try {
            const errorData = await retryResponse.json();
            if (DEBUG) console.error(`${logPrefix} Retry failed:`, errorData);
          } catch (e) {
            if (DEBUG) console.error(`${logPrefix} Retry failed with status:`, retryResponse.status);
          }
        }
      } else {
        if (DEBUG) console.log(`${logPrefix} Token refresh failed or no refresh token available`);
      }
      
      // Only clear tokens if we've exhausted retries and refresh failed
      // Don't clear on first 401 - might be cold start
      if (retryCount > 1) {
        if (DEBUG) console.log(`${logPrefix} Clearing tokens after multiple failures`);
        clearTokens();
      } else {
        if (DEBUG) console.log(`${logPrefix} Not clearing tokens yet (retryCount: ${retryCount})`);
      }
      return null;
    }

    if (!response.ok) {
      if (DEBUG) {
        console.error(`${logPrefix} Response not OK:`, {
          status: response.status,
          statusText: response.statusText
        });
        try {
          const errorData = await response.clone().json();
          console.error(`${logPrefix} Error data:`, errorData);
        } catch (e) {
          console.error(`${logPrefix} Could not parse error response`);
        }
      }
      return null;
    }

    const data = await response.json();
    if (DEBUG) {
      console.log(`${logPrefix} Response data:`, {
        success: data.success,
        hasUser: !!data.data?.user,
        userEmail: data.data?.user?.email
      });
    }
    
    if (data.success && data.data?.user) {
      if (DEBUG) console.log(`${logPrefix} ✅ Success! User authenticated:`, data.data.user.email);
      setUser(data.data.user);
      return data.data.user;
    } else {
      if (DEBUG) console.warn(`${logPrefix} Response success but no user data:`, data);
    }

    return null;
  } catch (error) {
    console.error(`${logPrefix} ❌ Error fetching current user:`, error);
    if (DEBUG) {
      console.error(`${logPrefix} Error details:`, {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    }
    // Don't clear tokens on network errors - might be cold start
    return null;
  }
};

/**
 * Logout
 * Clears both localStorage tokens and httpOnly cookies
 */
export const logout = async (): Promise<void> => {
  const token = getAccessToken();
  
  try {
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    // Backend will clear httpOnly cookies
    await fetch(`${API_BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers,
      credentials: 'include', // Important: sends cookies
    });
  } catch (error) {
    console.error('Error logging out:', error);
  } finally {
    // Clear localStorage tokens
    clearTokens();
  }
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = (): boolean => {
  return !!getAccessToken() && !!getUser();
};

