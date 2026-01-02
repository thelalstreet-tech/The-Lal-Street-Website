/**
 * Authentication Debugging Utilities
 * 
 * Use these functions in the browser console to debug auth issues
 * 
 * Example:
 *   import { debugAuth } from './utils/authDebug';
 *   debugAuth();
 */

export const debugAuth = () => {
  console.group('🔍 Authentication Debug Info');
  
  // Check localStorage
  const accessToken = localStorage.getItem('accessToken');
  const refreshToken = localStorage.getItem('refreshToken');
  const userStr = localStorage.getItem('user');
  
  console.log('📦 LocalStorage:');
  console.log('  - accessToken:', accessToken ? `exists (${accessToken.length} chars)` : '❌ missing');
  console.log('  - refreshToken:', refreshToken ? `exists (${refreshToken.length} chars)` : '❌ missing');
  console.log('  - user:', userStr ? JSON.parse(userStr) : '❌ missing');
  
  // Check cookies (can't read httpOnly cookies, but we can check if they're being sent)
  console.log('\n🍪 Cookies:');
  console.log('  - Note: httpOnly cookies cannot be read by JavaScript');
  console.log('  - Check DevTools → Application → Cookies to see httpOnly cookies');
  
  // Test API endpoint
  console.log('\n🌐 API Test:');
  const apiUrl = import.meta.env.VITE_API_URL || 
    (import.meta.env.MODE === 'production' 
      ? 'https://the-lal-street-website.onrender.com'
      : 'http://localhost:5000');
  
  console.log('  - API URL:', apiUrl);
  console.log('  - Testing /api/auth/me...');
  
  fetch(`${apiUrl}/api/auth/me`, {
    credentials: 'include',
    headers: accessToken ? {
      'Authorization': `Bearer ${accessToken}`
    } : {}
  })
    .then(async (response) => {
      console.log('  - Status:', response.status, response.statusText);
      console.log('  - Headers:', Object.fromEntries(response.headers.entries()));
      
      const data = await response.json();
      console.log('  - Response:', data);
      
      if (response.ok && data.success) {
        console.log('  ✅ Authentication successful!');
        console.log('  - User:', data.data.user);
      } else {
        console.log('  ❌ Authentication failed');
        console.log('  - Error:', data.message);
      }
    })
    .catch((error) => {
      console.error('  ❌ Request failed:', error);
    });
  
  console.groupEnd();
};

export const testAuthMe = async () => {
  const apiUrl = import.meta.env.VITE_API_URL || 
    (import.meta.env.MODE === 'production' 
      ? 'https://the-lal-street-website.onrender.com'
      : 'http://localhost:5000');
  
  const accessToken = localStorage.getItem('accessToken');
  
  console.log('🧪 Testing /api/auth/me endpoint...');
  console.log('Request config:', {
    url: `${apiUrl}/api/auth/me`,
    hasAuthHeader: !!accessToken,
    credentials: 'include'
  });
  
  try {
    const response = await fetch(`${apiUrl}/api/auth/me`, {
      credentials: 'include',
      headers: accessToken ? {
        'Authorization': `Bearer ${accessToken}`
      } : {}
    });
    
    console.log('Response:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries())
    });
    
    const data = await response.json();
    console.log('Response data:', data);
    
    return { response, data };
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
};

export const checkCookies = () => {
  console.group('🍪 Cookie Check');
  console.log('Note: httpOnly cookies cannot be read by JavaScript');
  console.log('To check cookies:');
  console.log('1. Open DevTools (F12)');
  console.log('2. Go to Application tab (Chrome) or Storage tab (Firefox)');
  console.log('3. Click on Cookies → your domain');
  console.log('4. Look for:');
  console.log('   - accessToken (should be httpOnly)');
  console.log('   - refreshToken (should be httpOnly)');
  console.log('\nCurrent document.cookie:', document.cookie || '(no readable cookies)');
  console.groupEnd();
};

export const clearAuthDebug = () => {
  console.log('🧹 Clearing auth data...');
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  console.log('✅ Cleared localStorage');
  console.log('Note: httpOnly cookies must be cleared via logout API or browser settings');
};

// Make functions available globally for console access
if (typeof window !== 'undefined') {
  (window as any).debugAuth = debugAuth;
  (window as any).testAuthMe = testAuthMe;
  (window as any).checkCookies = checkCookies;
  (window as any).clearAuthDebug = clearAuthDebug;
  
  console.log('🔧 Auth debug utilities available:');
  console.log('  - debugAuth() - Full auth debug info');
  console.log('  - testAuthMe() - Test /api/auth/me endpoint');
  console.log('  - checkCookies() - Check cookie info');
  console.log('  - clearAuthDebug() - Clear localStorage auth data');
}

