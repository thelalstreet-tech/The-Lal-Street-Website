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
  // Try localStorage first (for email/password login and OAuth token fallback)
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    console.log('Token found in localStorage:', { hasToken: true, tokenLength: token.length });
    return token;
  }
  
  console.log('No token in localStorage, will rely on cookies');
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

    const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers,
      credentials: 'include', // Important: sends cookies
      body: Object.keys(body).length > 0 ? JSON.stringify(body) : undefined,
    });

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
 * Get current user from server
 * Backend reads tokens from httpOnly cookies automatically
 */
export const getCurrentUser = async (): Promise<User | null> => {
  try {
    // Try with Authorization header first (for localStorage tokens)
    const token = getAccessToken();
    const headers: HeadersInit = {};
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    // If no token, backend will read from httpOnly cookies

    console.log('Fetching user from /api/auth/me', {
      hasToken: !!token,
      tokenLength: token?.length,
      tokenPreview: token ? token.substring(0, 20) + '...' : null,
      apiUrl: `${API_BASE_URL}/api/auth/me`,
      credentials: 'include',
      headers: Object.keys(headers)
    });

    const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
      headers,
      credentials: 'include', // Important: sends cookies with request
    });

    console.log('Response status:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response:', errorText);
    }

    if (response.status === 401) {
      // Token expired, try to refresh
      const newToken = await refreshAccessToken();
      if (newToken) {
        // Retry with new token
        const retryResponse = await fetch(`${API_BASE_URL}/api/auth/me`, {
          headers: {
            'Authorization': `Bearer ${newToken}`,
          },
          credentials: 'include',
        });
        if (retryResponse.ok) {
          const retryData = await retryResponse.json();
          if (retryData.success && retryData.data?.user) {
            // Store user in localStorage for consistency
            setUser(retryData.data.user);
            return retryData.data.user;
          }
        }
      }
      // Refresh failed, clear tokens
      clearTokens();
      return null;
    }

    if (!response.ok) return null;

    const data = await response.json();
    if (data.success && data.data?.user) {
      setUser(data.data.user);
      return data.data.user;
    }

    return null;
  } catch (error) {
    console.error('Error fetching current user:', error);
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

