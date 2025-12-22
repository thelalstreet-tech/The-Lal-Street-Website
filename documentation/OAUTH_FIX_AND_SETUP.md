# OAuth Fix and Setup Guide

## Issues Fixed

### 1. ✅ Rate Limiting Error (Fixed)
**Problem**: `ValidationError: The 'X-Forwarded-For' header is set but the Express 'trust proxy' setting is false`

**Solution**: Added `app.set('trust proxy', true)` in `server/server.js` to properly handle proxy headers from Render.

**File Changed**: `server/server.js`
- Added trust proxy configuration right after Express initialization

### 2. ✅ Duplicate Index Warning (Fixed)
**Problem**: Mongoose warning about duplicate schema indexes on `email` and `googleId`

**Solution**: Removed manual index creation since `unique: true` already creates indexes automatically.

**File Changed**: `server/models/User.js`
- Removed manual `userSchema.index()` calls

### 3. ✅ OAuth Callback URL (Fixed)
**Problem**: OAuth callback URL was using relative path instead of absolute URL

**Solution**: Updated OAuth configuration to construct absolute callback URL from environment variables.

**File Changed**: `server/routes/auth.routes.js`
- Now constructs absolute callback URL from `GOOGLE_CALLBACK_URL`, `SERVER_URL`, or `RENDER_EXTERNAL_URL`
- Added URL validation to prevent invalid formats
- Validates callback URL on startup

### 4. ✅ Security Vulnerabilities (Fixed)
**Problems**: 
- Open redirect vulnerability in `FRONTEND_URL`
- Missing CSRF protection
- Error information disclosure
- Missing rate limiting on OAuth callback

**Solutions**: 
- Created `urlValidator.js` utility for secure URL handling
- Implemented CSRF protection via state parameter
- Removed sensitive error details from redirect URLs
- Added rate limiting to OAuth callback endpoint (20 attempts/15 min)
- Added environment variable validation on startup

**Files Changed**: 
- `server/routes/auth.routes.js` - Security fixes, CSRF protection
- `server/controllers/auth.controller.js` - URL validation, error handling
- `server/utils/urlValidator.js` - NEW: URL validation utility
- `server/utils/envValidator.js` - NEW: Environment validation utility
- `server/utils/jwt.js` - Secret validation

---

## Google OAuth Setup Instructions

### Step 1: Configure Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create a new one)
3. Navigate to **APIs & Services** > **Credentials**
4. Click **Create Credentials** > **OAuth client ID**
5. Configure OAuth consent screen first if prompted:
   - User Type: **External** (for public use)
   - App name: **The Lal Street**
   - User support email: Your email
   - Developer contact: Your email
   - Add scopes: `email`, `profile`
   - Add test users (if in testing mode)

6. Create OAuth 2.0 Client ID:
   - Application type: **Web application**
   - Name: **The Lal Street Web Client**
   - **Authorized JavaScript origins**:
     ```
     https://the-lal-street-website.onrender.com
     https://your-frontend-domain.vercel.app
     http://localhost:5173 (for development)
     ```
   - **Authorized redirect URIs** (CRITICAL - must match exactly):
     ```
     https://the-lal-street-website.onrender.com/api/auth/google/callback
     http://localhost:5000/api/auth/google/callback (for development)
     ```

7. Copy the **Client ID** and **Client Secret**

### Step 2: Set Environment Variables on Render

Go to your Render dashboard > Your Service > Environment and add:

```bash
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret-here

# OAuth Callback URL (should match exactly what you set in Google Console)
GOOGLE_CALLBACK_URL=https://the-lal-street-website.onrender.com/api/auth/google/callback

# Server URL (optional, will be auto-detected from RENDER_EXTERNAL_URL)
SERVER_URL=https://the-lal-street-website.onrender.com

# Frontend URL (for redirects after OAuth)
FRONTEND_URL=https://your-frontend-domain.vercel.app

# Other required variables
MONGODB_URI=your-mongodb-connection-string
JWT_SECRET=your-jwt-secret-key-min-32-characters-long
JWT_REFRESH_SECRET=your-refresh-token-secret-min-32-characters-long
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Frontend URL (validated against ALLOWED_ORIGINS for security)
FRONTEND_URL=https://your-frontend-domain.vercel.app
ALLOWED_ORIGINS=https://your-frontend-domain.vercel.app,https://www.thelalstreet.com

# Trust Proxy (optional, defaults to 1)
TRUST_PROXY=1
```

### Step 3: Verify OAuth Configuration

1. **Check callback URL matches exactly**:
   - Google Console: `https://the-lal-street-website.onrender.com/api/auth/google/callback`
   - Render Environment: `GOOGLE_CALLBACK_URL=https://the-lal-street-website.onrender.com/api/auth/google/callback`
   - Must be **exactly** the same (including https, no trailing slash)

2. **Common OAuth Errors**:
   - **Error 400: invalid_request**: Usually means callback URL mismatch
   - **Error 403: access_denied**: OAuth consent screen not configured
   - **Error 401: invalid_client**: Client ID or Secret incorrect

3. **Test the configuration**:
   ```bash
   # Check if OAuth is configured (after deployment)
   curl https://the-lal-street-website.onrender.com/api/debug/env
   ```
   Should show `hasGoogleClientId: true` and `hasGoogleClientSecret: true`

### Step 4: OAuth App Verification (For Production)

If your app is in **Testing** mode, only test users can sign in. To make it public:

1. Go to **OAuth consent screen** in Google Cloud Console
2. Click **Publish App**
3. Complete verification if required (for sensitive scopes)
4. Note: Verification may take several days for production apps

---

## Testing OAuth Locally

1. Set up local environment variables in `server/.env`:
   ```bash
   GOOGLE_CLIENT_ID=your-client-id
   GOOGLE_CLIENT_SECRET=your-client-secret
   GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
   FRONTEND_URL=http://localhost:5173
   ```

2. Make sure `http://localhost:5000/api/auth/google/callback` is in Google Console's authorized redirect URIs

3. Start the server:
   ```bash
   cd server
   npm start
   ```

4. Test OAuth flow from frontend

---

## Troubleshooting

### OAuth Still Not Working?

1. **Check logs**:
   ```bash
   # View Render logs
   # Look for OAuth-related errors
   ```

2. **Verify environment variables**:
   - Use `/api/debug/env` endpoint to check if variables are set
   - Make sure there are no extra spaces or quotes

3. **Check Google Console**:
   - Authorized redirect URIs must match **exactly**
   - No trailing slashes
   - Use `https://` not `http://` for production

4. **Common Issues**:
   - **Callback URL mismatch**: Most common issue - must match exactly
   - **App in testing mode**: Only test users can sign in
   - **Wrong credentials**: Double-check Client ID and Secret
   - **CORS issues**: Make sure frontend URL is in allowed origins

---

## Security Features Implemented

### CSRF Protection
- State parameter generation using `crypto.randomBytes(32)`
- State stored in httpOnly cookie
- Constant-time comparison for state validation
- State cleared after successful validation

### URL Validation
- All redirect URLs validated against whitelist
- Prevents open redirect attacks
- Validates URL format and protocol
- Ensures HTTPS in production

### Rate Limiting
- OAuth callback endpoint: 20 attempts per 15 minutes
- Prevents brute force attacks
- Protects against authorization code reuse attempts

### Error Handling
- Sensitive error details logged server-side only
- Generic error messages to users
- Prevents information disclosure

### Environment Validation
- Validates all critical environment variables on startup
- Ensures JWT secrets are set in production
- Validates Google OAuth credentials format
- Warns about weak secrets

## Summary of Changes

1. ✅ Fixed rate limiting error by adding `trust proxy`
2. ✅ Fixed duplicate index warnings in User model
3. ✅ Fixed OAuth callback URL to use absolute URLs
4. ✅ Added proper environment variable handling for OAuth
5. ✅ Implemented CSRF protection (state parameter)
6. ✅ Added URL validation to prevent open redirects
7. ✅ Added rate limiting to OAuth callback
8. ✅ Improved error handling (no sensitive data exposure)
9. ✅ Added environment variable validation on startup
10. ✅ Enhanced JWT secret validation

**Next Steps**:
1. Configure Google OAuth credentials in Google Cloud Console
2. Set environment variables on Render (see requirements below)
3. Ensure callback URL matches exactly
4. Test OAuth flow
5. Verify security measures are working (check logs for state validation)

