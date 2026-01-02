# 🔍 Authentication Debugging Guide

## Quick Debug Commands

Open your browser console (F12) and run these commands:

### 1. Full Auth Debug
```javascript
debugAuth()
```
Shows:
- localStorage tokens and user data
- Cookie information
- Tests `/api/auth/me` endpoint
- Shows response status and data

### 2. Test Auth/Me Endpoint
```javascript
testAuthMe()
```
Directly tests the `/api/auth/me` endpoint and shows:
- Request configuration
- Response status
- Response data
- Error details if any

### 3. Check Cookies
```javascript
checkCookies()
```
Shows instructions for checking httpOnly cookies in DevTools

### 4. Clear Auth Data
```javascript
clearAuthDebug()
```
Clears localStorage auth data (cookies must be cleared via logout API)

---

## Detailed Debugging Steps

### Step 1: Check Browser Console Logs

When the page loads, you should see detailed logs like:

```
[AuthContext:initializeAuth] Starting auth initialization...
[AuthContext:initializeAuth] Checking authentication state...
[AuthContext:initializeAuth] localStorage token: exists
[getCurrentUser:0] Making request to: https://the-lal-street-website.onrender.com/api/auth/me
[getCurrentUser:0] Response received: { status: 200, ... }
[getCurrentUser:0] ✅ Success! User authenticated: user@example.com
```

### Step 2: Check Network Tab

1. Open DevTools → Network tab
2. Filter by "auth/me"
3. Click on the request
4. Check:

**Request Headers:**
- Should see `Cookie:` header with `accessToken` and `refreshToken`
- If using localStorage token, should see `Authorization: Bearer ...`

**Response:**
- Status: 200 (success) or 401 (unauthorized)
- Response body should contain user data

### Step 3: Check Cookies

1. DevTools → Application tab (Chrome) or Storage tab (Firefox)
2. Click "Cookies" → your domain
3. Look for:
   - `accessToken` (should be httpOnly, secure, sameSite: lax)
   - `refreshToken` (should be httpOnly, secure, sameSite: lax)

**Common Issues:**
- ❌ Cookies missing → Login again
- ❌ Cookies not httpOnly → Backend issue
- ❌ Cookies domain mismatch → CORS/domain issue

### Step 4: Check Backend Logs

On Render dashboard, check logs for:
```
[authenticateToken] Token check: { hasToken: true, tokenSource: 'Cookie' }
[authenticateToken] ✅ Authentication successful: { userId: ..., email: ... }
```

Or errors:
```
[authenticateToken] Token verification failed: Token expired
[authenticateToken] No token found
```

---

## Common Issues & Solutions

### Issue 1: 401 Unauthorized but Cookies Exist

**Symptoms:**
- Cookies are present in browser
- `auth/me` returns 401
- Manual test in browser URL works

**Possible Causes:**
1. **Expired localStorage token interfering**
   - Solution: Clear localStorage or let cookies take precedence (already fixed)

2. **CORS not sending cookies**
   - Check: Network tab → Request Headers → Should see `Cookie:` header
   - Solution: Ensure `credentials: 'include'` is set (✅ already done)

3. **Cookie domain/path mismatch**
   - Check: Cookie domain should match API domain
   - Solution: Backend sets cookies with correct domain

4. **Backend middleware priority**
   - Fixed: Backend now checks cookies FIRST before Authorization header

### Issue 2: User Not Updated in Navbar

**Symptoms:**
- Login successful
- `auth/me` returns user data
- Navbar still shows "Login" button

**Possible Causes:**
1. **AuthContext state not updating**
   - Check: Console logs should show `setUser()` being called
   - Solution: Check if `isMounted` flag is preventing update

2. **Component not re-rendering**
   - Check: Navigation component should use `useAuth()` hook
   - Solution: Ensure Navigation is inside AuthProvider

### Issue 3: Cold Start Issues

**Symptoms:**
- First request after idle time fails
- Takes 30-60 seconds
- Retries eventually succeed

**Solution:**
- Already implemented: Exponential backoff retry (2s, 4s, 8s)
- Backend logs will show when server wakes up

---

## Debug Checklist

When debugging auth issues, check:

- [ ] Browser console logs (detailed auth flow)
- [ ] Network tab (request/response details)
- [ ] Cookies (Application tab)
- [ ] localStorage (Application tab)
- [ ] Backend logs (Render dashboard)
- [ ] CORS configuration (server.js)
- [ ] Cookie settings (secure, httpOnly, sameSite)

---

## Test Scenarios

### Scenario 1: Fresh Login (Google OAuth)
1. Clear all cookies and localStorage
2. Click "Login with Google"
3. Complete OAuth flow
4. Check console logs for:
   - Cookies being set
   - `auth/me` being called
   - User state being set

### Scenario 2: Existing Session
1. Already logged in
2. Refresh page
3. Check console logs for:
   - `auth/me` being called immediately
   - User state restored
   - No 401 errors

### Scenario 3: Expired Token
1. Wait for token to expire (15 minutes)
2. Make a request
3. Check console logs for:
   - 401 error
   - Token refresh attempt
   - Retry with new token

---

## Logging Levels

### Frontend (Client)
- `DEBUG = true` in `authService.ts` and `AuthContext.tsx`
- Logs all auth operations with `[getCurrentUser:X]` and `[AuthContext:...]` prefixes

### Backend (Server)
- `DEBUG = process.env.NODE_ENV !== 'production'`
- Logs in `auth.middleware.js` and `auth.controller.js`
- Check Render logs for `[authenticateToken]` and `[getMe]` prefixes

---

## Next Steps

If issues persist after checking all above:

1. **Run `debugAuth()` in console** - Get full diagnostic
2. **Check Network tab** - See exact request/response
3. **Check Backend logs** - See server-side processing
4. **Test manually** - Use browser URL to test endpoint directly
5. **Compare working vs failing** - What's different?

---

**Last Updated**: 2026-01-02

