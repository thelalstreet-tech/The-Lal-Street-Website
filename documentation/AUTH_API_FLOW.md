# Authentication API Flow & Data Flow Analysis

## 📋 Table of Contents
1. [When `auth/me` is Called](#when-authme-is-called)
2. [Page Load Sequence (Opening thelalstreet.com)](#page-load-sequence)
3. [Login Flow - Email/Password](#login-flow-emailpassword)
4. [Login Flow - Google OAuth](#login-flow-google-oauth)
5. [API Call Sequence Diagrams](#api-call-sequence-diagrams)
6. [Why `auth/me` Might Fail](#why-authme-might-fail)

---

## 🔍 When `auth/me` is Called

The `/api/auth/me` endpoint is called in the following scenarios:

### 1. **On Initial Page Load** (Most Common)
- **Location**: `client/src/contexts/AuthContext.tsx` → `initializeAuth()` function
- **When**: Immediately when the app loads (after 500ms delay)
- **Purpose**: Check if user is already authenticated (from cookies or localStorage)
- **Flow**:
  ```
  App Loads → AuthProvider mounts → useEffect runs → initializeAuth() → getCurrentUser() → GET /api/auth/me
  ```

### 2. **After Token Refresh**
- **Location**: `client/src/services/authService.ts` → `getCurrentUser()`
- **When**: If `auth/me` returns 401, it tries to refresh token, then calls `auth/me` again
- **Purpose**: Verify the refreshed token works

### 3. **When Verifying Stored User**
- **Location**: `client/src/contexts/AuthContext.tsx` → `initializeAuth()` fallback path
- **When**: If user is found in localStorage, verify with server
- **Purpose**: Ensure stored token is still valid

### 4. **Manual Refresh**
- **Location**: `client/src/contexts/AuthContext.tsx` → `refreshUser()` function
- **When**: Called explicitly via `useAuth().refreshUser()`
- **Purpose**: Manually refresh user data

---

## 🚀 Page Load Sequence (Opening thelalstreet.com)

### Step-by-Step API Call Sequence:

```
1. Browser loads thelalstreet.com
   ↓
2. React app initializes
   ↓
3. AuthProvider mounts (wraps entire app)
   ↓
4. AuthContext.initializeAuth() runs (after 500ms delay)
   ↓
5. GET /api/auth/me (with credentials: 'include')
   ├─ Success (200): User authenticated → Set user state → Continue
   ├─ 401 Unauthorized: 
   │   ├─ Try refresh: POST /api/auth/refresh
   │   │   ├─ Success: GET /api/auth/me (retry with new token)
   │   │   └─ Fail: Clear tokens, user = null
   │   └─ No refresh token: user = null
   └─ Network Error: Retry with exponential backoff (2s, 4s, 8s)
   ↓
6. App renders (HomePage, Navigation, etc.)
   ↓
7. HomePage mounts → useEffect runs
   ↓
8. GET /api/suggested-buckets (if cache invalid)
   ↓
9. Other page-specific API calls (if applicable)
```

### Detailed Timeline:

| Time | Event | API Call | Notes |
|------|-------|----------|-------|
| 0ms | Page loads | - | HTML/JS bundle downloads |
| ~100ms | React initializes | - | Components mount |
| ~500ms | AuthProvider useEffect | - | 500ms delay for OAuth cookies |
| ~500ms | `getCurrentUser()` called | **GET /api/auth/me** | **FIRST API CALL** |
| ~500-2000ms | If 401, refresh token | **POST /api/auth/refresh** | Only if 401 |
| ~2000ms | Retry auth/me | **GET /api/auth/me** | If refresh succeeded |
| ~2000ms | HomePage mounts | - | After auth check |
| ~2500ms | Load suggested buckets | **GET /api/suggested-buckets** | If cache invalid |

---

## 🔐 Login Flow - Email/Password

### Complete Data Flow:

```
1. User clicks "Sign In" → LoginModal opens
   ↓
2. User enters email/password → Clicks "Sign In"
   ↓
3. LoginModal.handleSubmit() calls:
   → useAuth().login(email, password)
   → authService.login(email, password)
   ↓
4. POST /api/auth/login
   Request Body: { email, password }
   ↓
5. Backend (auth.controller.js):
   ├─ Validates email/password
   ├─ Checks database for user
   ├─ Verifies password (bcrypt)
   ├─ Generates tokens (JWT)
   ├─ Sets httpOnly cookies:
   │   ├─ accessToken (15 min expiry)
   │   └─ refreshToken (7 days expiry)
   └─ Returns response:
       {
         success: true,
         data: {
           user: { id, email, name, picture, authProvider },
           accessToken: "...",
           refreshToken: "..."
         }
       }
   ↓
6. Frontend (authService.ts):
   ├─ Stores tokens in localStorage (for email/password)
   ├─ Stores user in localStorage
   └─ Returns response
   ↓
7. AuthContext.login():
   ├─ Sets user state: setUser(response.data.user)
   └─ App re-renders with authenticated user
   ↓
8. App.tsx detects isAuthenticated = true:
   ├─ Closes login modal
   ├─ Removes session storage flags
   └─ Shows authenticated UI
```

### API Calls in Sequence:

1. **POST /api/auth/login**
   - Headers: `Content-Type: application/json`
   - Body: `{ email, password }`
   - Response: User data + tokens
   - Sets cookies: `accessToken`, `refreshToken`

2. **GET /api/auth/me** (optional, if refresh needed)
   - Headers: `Authorization: Bearer <token>` OR cookies
   - Response: Current user data

---

## 🌐 Login Flow - Google OAuth

### Complete Data Flow:

```
1. User clicks "Continue with Google"
   ↓
2. LoginModal.handleGoogleLogin() calls:
   → useAuth().loginWithGoogle()
   → authService.loginWithGoogle()
   ↓
3. window.location.href = '/api/auth/google'
   (Full page redirect to backend)
   ↓
4. Backend (auth.routes.js):
   ├─ Passport Google Strategy initiates
   ├─ Redirects to Google OAuth consent screen
   └─ User authorizes on Google
   ↓
5. Google redirects back to:
   /api/auth/google/callback?code=...
   ↓
6. Backend (auth.controller.js → googleCallback):
   ├─ Exchanges code for user info
   ├─ Finds or creates user in database
   ├─ Generates tokens (JWT)
   ├─ Sets httpOnly cookies:
   │   ├─ accessToken (15 min expiry)
   │   └─ refreshToken (7 days expiry)
   └─ Redirects to frontend:
       /#home (or original URL)
   ↓
7. Frontend loads (after redirect):
   ├─ AuthProvider mounts
   ├─ initializeAuth() runs (after 500ms)
   └─ GET /api/auth/me (reads from cookies)
   ↓
8. Backend returns user data from cookies
   ↓
9. AuthContext sets user state
   ↓
10. App shows authenticated UI
```

### API Calls in Sequence:

1. **GET /api/auth/google**
   - Redirects to Google OAuth
   - No direct API response

2. **GET /api/auth/google/callback**
   - Google redirects here with code
   - Backend processes, sets cookies
   - Redirects to frontend

3. **GET /api/auth/me** (after redirect)
   - Headers: `credentials: 'include'` (sends cookies)
   - Backend reads from httpOnly cookies
   - Response: Current user data

---

## 📊 API Call Sequence Diagrams

### Scenario 1: Cold Start (Render Free Tier)

```
Time    | Frontend                    | Backend (Render)
--------|----------------------------|------------------
0ms     | Page loads                 | (Cold - sleeping)
500ms   | GET /api/auth/me           | (Waking up...)
        |                            | (30-60s delay)
        | Retry 1 (after 2s)         | Still waking...
        | Retry 2 (after 4s)         | Still waking...
        | Retry 3 (after 8s)         | ✅ Ready!
        |                            | Response: 401 (no cookies)
        |                            | (User not logged in)
```

### Scenario 2: User Already Logged In (Warm Server)

```
Time    | Frontend                    | Backend
--------|----------------------------|------------------
0ms     | Page loads                 | (Warm - ready)
500ms   | GET /api/auth/me           | ✅ Immediate response
        | (with cookies)              | 200 OK + user data
        | Set user state              | 
```

### Scenario 3: Login with Email/Password

```
Time    | Frontend                    | Backend
--------|----------------------------|------------------
0ms     | User clicks "Sign In"      |
100ms   | POST /api/auth/login       | ✅ Validate credentials
        |                            | Generate tokens
        |                            | Set cookies
        | Store tokens in localStorage|
        | Set user state              |
200ms   | App re-renders              |
```

### Scenario 4: Login with Google OAuth

```
Time    | Frontend                    | Backend              | Google
--------|----------------------------|---------------------|----------
0ms     | User clicks "Google"       |
50ms    | Redirect to /api/auth/google| ✅ Initiate OAuth  |
        |                            | Redirect to Google   | ✅
        |                            |                      | User authorizes
        |                            |                      | Redirect back
500ms   | GET /api/auth/google/callback| ✅ Process code   |
        |                            | Set cookies          |
        |                            | Redirect to /#home   |
1000ms  | Page loads (after redirect)|
1500ms  | GET /api/auth/me           | ✅ Read cookies     |
        |                            | Return user data     |
```

---

## ⚠️ Why `auth/me` Might Fail

### Common Failure Scenarios:

#### 1. **Cold Start on Render Free Tier**
- **Problem**: Backend takes 30-60 seconds to wake up
- **Symptom**: 401 Unauthorized or network timeout
- **Current Fix**: Retry logic with exponential backoff (2s, 4s, 8s)
- **Solution**: Wait for backend to wake up

#### 2. **Missing or Expired Cookies**
- **Problem**: httpOnly cookies not sent or expired
- **Symptom**: 401 Unauthorized
- **Check**: Browser DevTools → Application → Cookies
- **Solution**: Re-login or refresh token

#### 3. **CORS Issues**
- **Problem**: Cookies not sent due to CORS misconfiguration
- **Symptom**: 401 Unauthorized
- **Check**: Network tab → Request Headers → Should see `Cookie:` header
- **Solution**: Ensure `credentials: 'include'` is set (✅ already done)

#### 4. **Token Expired**
- **Problem**: accessToken expired (15 min), refreshToken also expired
- **Symptom**: 401 Unauthorized, refresh also fails
- **Solution**: User must re-login

#### 5. **Database Connection Issues**
- **Problem**: MongoDB not connected on backend
- **Symptom**: 503 Service Unavailable
- **Check**: Backend logs
- **Solution**: Check MONGODB_URI environment variable

#### 6. **Network Errors**
- **Problem**: Request fails before reaching server
- **Symptom**: Network error in console
- **Solution**: Retry logic handles this (✅ already implemented)

---

## 🔧 Current Retry Logic

The current implementation includes:

1. **Exponential Backoff**: 2s → 4s → 8s delays
2. **Max Retries**: 3 attempts for `auth/me`, 3 for `refresh`
3. **Smart Token Clearing**: Only clears tokens after multiple failures (not on first 401)
4. **Network Error Handling**: Retries on network failures, not just 401s

### Code Location:
- `client/src/services/authService.ts` → `fetchWithRetry()`
- `client/src/services/authService.ts` → `getCurrentUser()`
- `client/src/services/authService.ts` → `refreshAccessToken()`

---

## 📝 Summary

**When `auth/me` is called:**
1. ✅ On every page load (after 500ms delay)
2. ✅ After token refresh (if 401 received)
3. ✅ When verifying stored user
4. ✅ On manual refresh

**Why it might fail:**
1. ⚠️ Cold start (30-60s delay on Render free tier)
2. ⚠️ Missing/expired cookies
3. ⚠️ CORS issues (unlikely, already handled)
4. ⚠️ Token expired
5. ⚠️ Database connection issues
6. ⚠️ Network errors

**Current mitigations:**
- ✅ Retry logic with exponential backoff
- ✅ Smart token clearing (doesn't clear on first 401)
- ✅ Network error handling
- ✅ Proper CORS configuration

---

## 🐛 Debugging Tips

### Check Browser Console:
```javascript
// Open DevTools → Network tab
// Filter: "auth/me"
// Check:
// 1. Request URL: Should be https://the-lal-street-website.onrender.com/api/auth/me
// 2. Request Headers: Should include "Cookie:" header
// 3. Response Status: 200 (success), 401 (unauthorized), 503 (server error)
// 4. Response Time: If >30s, likely cold start
```

### Check Application Cookies:
```javascript
// DevTools → Application → Cookies
// Should see:
// - accessToken (if logged in)
// - refreshToken (if logged in)
// Both should be httpOnly (not visible in JavaScript)
```

### Test API Directly:
```bash
# Test auth/me endpoint
curl -X GET https://the-lal-street-website.onrender.com/api/auth/me \
  --cookie "accessToken=YOUR_TOKEN" \
  --cookie "refreshToken=YOUR_REFRESH_TOKEN"
```

---

**Last Updated**: 2026-01-02
**Related Files**:
- `client/src/contexts/AuthContext.tsx`
- `client/src/services/authService.ts`
- `server/controllers/auth.controller.js`
- `server/routes/auth.routes.js`

