# OAuth Token Debugging Guide

## Current Issue
401 Unauthorized when calling `/api/auth/me` after OAuth login.

## What We've Implemented

### 1. Token in URL Fallback
- Backend passes token in redirect URL: `?oauth_success=true&token=xxx`
- Frontend extracts token from URL
- Frontend stores token in localStorage
- Frontend cleans URL immediately

### 2. Enhanced Logging
Added comprehensive logging at every step to track token flow.

## Debugging Steps

### Step 1: Check Browser Console
Look for these log messages in order:

1. **OAuth callback detected**
   ```
   OAuth callback detected: { oauthSuccess: 'true', hasToken: true, tokenLength: XXX }
   ```

2. **Token extraction**
   ```
   Token found in URL, storing in localStorage...
   Token stored, verification: { stored: true, storedLength: XXX, matches: true }
   ```

3. **Token retrieval**
   ```
   Token found in localStorage: { hasToken: true, tokenLength: XXX }
   ```

4. **API request**
   ```
   Fetching user from /api/auth/me { hasToken: true, tokenLength: XXX, ... }
   ```

5. **Response**
   ```
   Response status: 200 OK
   ```

### Step 2: Check localStorage
Open DevTools → Application → Local Storage → Check for:
- `accessToken` key
- Should have a long JWT token value

### Step 3: Check Network Tab
1. Open DevTools → Network tab
2. Find the `/api/auth/me` request
3. Check **Request Headers**:
   - Should have: `Authorization: Bearer <token>`
   - If missing, token isn't being sent

4. Check **Response**:
   - Status: Should be 200, not 401
   - If 401, check response body for error message

### Step 4: Check Backend Logs
Look for these messages:

1. **Token received**
   ```
   Token found in Authorization header { tokenLength: XXX }
   ```
   OR
   ```
   Token found in cookie { tokenLength: XXX }
   ```

2. **If no token**
   ```
   No token found in request { hasAuthHeader: false, hasCookies: false, ... }
   ```

## Common Issues & Solutions

### Issue 1: Token Not in URL
**Symptoms:** `hasToken: false` in logs
**Cause:** Backend not passing token in redirect URL
**Solution:** Check backend logs for redirect URL, verify token is included

### Issue 2: Token Not Stored
**Symptoms:** Token extraction logged but `localStorage.getItem('accessToken')` returns null
**Cause:** localStorage blocked or cleared
**Solution:** Check browser settings, try incognito mode

### Issue 3: Token Not Sent in Request
**Symptoms:** `hasToken: false` in API request log, no Authorization header
**Cause:** `getAccessToken()` not finding token
**Solution:** Verify token key matches: `localStorage.getItem('accessToken')`

### Issue 4: Token Invalid/Expired
**Symptoms:** 401 with message "Invalid or expired token"
**Cause:** Token malformed or expired
**Solution:** Check token format, verify JWT secret matches

### Issue 5: CORS Issues
**Symptoms:** Request fails before reaching server
**Cause:** CORS not allowing credentials
**Solution:** Verify CORS config allows `credentials: true`

## What to Check Now

1. **Open browser console** and look for the log messages above
2. **Check localStorage** for `accessToken`
3. **Check Network tab** for Authorization header
4. **Check backend logs** for token reception

## Expected Flow

```
1. User completes OAuth → Backend redirects with token in URL
2. Frontend extracts token → Stores in localStorage
3. Frontend calls /api/auth/me → Sends token in Authorization header
4. Backend receives token → Validates → Returns user
5. Frontend updates state → Shows profile, closes popup
```

## Next Steps

Based on the logs, we can identify exactly where the flow is breaking:
- If token not in URL → Backend issue
- If token not stored → Frontend storage issue
- If token not sent → Frontend request issue
- If token not received → Network/CORS issue
- If token invalid → Backend validation issue

