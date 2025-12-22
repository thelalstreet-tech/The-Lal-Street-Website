# Authentication Setup Guide

This guide explains how to set up authentication for The Lal Street application, including Google OAuth, email/password login, and MongoDB Atlas configuration.

## Overview

The authentication system includes:
- **Google OAuth Login** - Sign in with Google account
- **Email/Password Login** - Traditional registration and login
- **Session Persistence** - Users stay logged in across sessions (like Canva)
- **2-Minute Popup** - Optional login prompt after 2 minutes of browsing
- **MongoDB Atlas** - User data storage

---

## Prerequisites

1. Google Cloud Console account
2. MongoDB Atlas account
3. Node.js and npm installed

---

## Step 1: Google Cloud Console Setup

### 1.1 Create a Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click on the project dropdown at the top
3. Click "New Project"
4. Enter project name: "The Lal Street" (or your preferred name)
5. Click "Create"

### 1.2 Enable Google+ API

1. In the Google Cloud Console, go to **APIs & Services** > **Library**
2. Search for "Google+ API" or "Google Identity Services"
3. Click on it and click **Enable**

### 1.3 Create OAuth 2.0 Credentials

1. Go to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **OAuth client ID**
3. If prompted, configure the OAuth consent screen:
   - User Type: **External** (for public use)
   - App name: "The Lal Street"
   - User support email: Your email
   - Developer contact: Your email
   - Click **Save and Continue**
   - Scopes: Add `email` and `profile`
   - Click **Save and Continue**
   - Test users: Add your email (for testing)
   - Click **Save and Continue**
   - Click **Back to Dashboard**

4. Create OAuth Client ID:
   - Application type: **Web application**
   - Name: "The Lal Street Web Client"
   - **Authorized JavaScript origins:**
     ```
     http://localhost:5173
     http://localhost:3000
     https://your-vercel-domain.vercel.app
     ```
   - **Authorized redirect URIs:**
     ```
     http://localhost:5000/api/auth/google/callback
     https://your-backend-url.onrender.com/api/auth/google/callback
     ```
   - Click **Create**

5. **Save your credentials:**
   - **Client ID**: Copy this value
   - **Client Secret**: Copy this value (keep it secret!)

---

## Step 2: MongoDB Atlas Setup

### 2.1 Create MongoDB Atlas Account

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Sign up for a free account
3. Verify your email

### 2.2 Create a Cluster

1. After logging in, click **Build a Database**
2. Choose **FREE** (M0) tier
3. Select a cloud provider and region (choose closest to your users)
4. Click **Create**

### 2.3 Create Database User

1. Go to **Database Access** in the left sidebar
2. Click **Add New Database User**
3. Choose **Password** authentication
4. Enter username and password (save these!)
5. Set user privileges to **Read and write to any database**
6. Click **Add User**

### 2.4 Configure Network Access

1. Go to **Network Access** in the left sidebar
2. Click **Add IP Address**
3. For development: Click **Allow Access from Anywhere** (0.0.0.0/0)
   - **Note**: For production, restrict to specific IPs
4. Click **Confirm**

### 2.5 Get Connection String

1. Go to **Database** in the left sidebar
2. Click **Connect** on your cluster
3. Choose **Connect your application**
4. Driver: **Node.js**, Version: **5.5 or later**
5. Copy the connection string:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
6. Replace `<username>` and `<password>` with your database user credentials
7. Add database name at the end:
   ```
   mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/the-lal-street?retryWrites=true&w=majority
   ```

---

## Step 3: Environment Variables

### 3.1 Backend Environment Variables

Create a `.env` file in the `server/` directory:

```bash
# Server Configuration
NODE_ENV=development
PORT=5000

# MongoDB Atlas Connection
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/the-lal-street?retryWrites=true&w=majority

# Google OAuth Credentials
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

# JWT Secrets (generate strong random strings)
JWT_SECRET=your-super-secret-jwt-key-min-32-characters-long
JWT_REFRESH_SECRET=your-refresh-token-secret-min-32-characters-long
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Frontend URL (for CORS and redirects)
FRONTEND_URL=http://localhost:5173

# Allowed Origins (comma-separated)
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# Admin Password (for admin panel - separate from user auth)
ADMIN_PASSWORD=your-admin-password
```

### 3.2 Frontend Environment Variables

Create a `.env` file in the `client/` directory:

```bash
# API Configuration
VITE_API_URL=http://localhost:5000

# Google OAuth Client ID (for frontend if needed)
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

### 3.3 Production Environment Variables

#### Render (Backend)

1. Go to your Render dashboard
2. Select your service
3. Go to **Environment**
4. Add all backend environment variables from Step 3.1
5. Update URLs to production:
   - `GOOGLE_CALLBACK_URL`: `https://your-backend.onrender.com/api/auth/google/callback`
   - `FRONTEND_URL`: `https://your-frontend.vercel.app`
   - `ALLOWED_ORIGINS`: `https://your-frontend.vercel.app`

#### Vercel (Frontend)

1. Go to your Vercel project settings
2. Go to **Environment Variables**
3. Add:
   - `VITE_API_URL`: `https://your-backend.onrender.com`
   - `VITE_GOOGLE_CLIENT_ID`: Your Google Client ID

#### Google Cloud Console (Production)

Update OAuth credentials with production URLs:
- **Authorized JavaScript origins:**
  ```
  https://your-frontend.vercel.app
  ```
- **Authorized redirect URIs:**
  ```
  https://your-backend.onrender.com/api/auth/google/callback
  ```

---

## Step 4: Install Dependencies

### Backend

```bash
cd server
npm install
```

This will install:
- `mongoose` - MongoDB ODM
- `passport` - Authentication middleware
- `passport-google-oauth20` - Google OAuth strategy
- `passport-local` - Local authentication strategy
- `bcrypt` - Password hashing
- `jsonwebtoken` - JWT token generation
- `cookie-parser` - Cookie parsing middleware

### Frontend

Dependencies are already included. No additional installation needed.

---

## Step 5: Testing the Setup

### 5.1 Start Backend Server

```bash
cd server
npm start
# or for development
npm run dev
```

Check console for:
- ✅ MongoDB connected successfully
- ✅ Server is running on http://localhost:5000

### 5.2 Start Frontend

```bash
cd client
npm run dev
```

### 5.3 Test Authentication

1. **Email/Password Registration:**
   - Wait 2 minutes on the homepage (or manually trigger login)
   - Click "Sign up"
   - Enter name, email, and password
   - Click "Create Account"
   - Should redirect and show you're logged in

2. **Email/Password Login:**
   - Click "Sign in"
   - Enter email and password
   - Should log in successfully

3. **Google OAuth:**
   - Click "Continue with Google"
   - Should redirect to Google login
   - After authentication, should redirect back and log you in

4. **Session Persistence:**
   - Log in
   - Close browser
   - Reopen and visit site
   - Should automatically be logged in (if within 7 days)

---

## Security Best Practices

### 1. JWT Secrets

Generate strong random secrets:
```bash
# On Linux/Mac
openssl rand -base64 32

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 2. Environment Variables

- **Never commit `.env` files to Git**
- Use strong, unique secrets for production
- Rotate secrets periodically
- Use different secrets for development and production

### 3. MongoDB Atlas

- Use strong database passwords
- Restrict network access to specific IPs in production
- Enable MongoDB Atlas monitoring
- Set up database backups

### 4. Google OAuth

- Keep Client Secret secure
- Regularly review OAuth consent screen
- Monitor OAuth usage in Google Cloud Console
- Use production URLs in production environment

---

## Troubleshooting

### MongoDB Connection Issues

**Error**: `MongoServerError: bad auth`

- Check username and password in connection string
- Verify database user has correct permissions
- Ensure network access allows your IP

**Error**: `MongooseServerSelectionError`

- Check network access in MongoDB Atlas
- Verify connection string format
- Check if cluster is running

### Google OAuth Issues

**Error**: `redirect_uri_mismatch`

- Verify redirect URI matches exactly in Google Cloud Console
- Check `GOOGLE_CALLBACK_URL` environment variable
- Ensure URLs use `http://` for localhost, `https://` for production

**Error**: `invalid_client`

- Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are correct
- Check if OAuth consent screen is configured
- Ensure API is enabled

### JWT Token Issues

**Error**: `Token expired`

- This is normal - tokens expire after 15 minutes
- Refresh token should automatically get new access token
- If refresh token expires, user needs to log in again

### 2-Minute Popup Not Showing

- Check browser console for errors
- Verify `localStorage` is not blocked
- Check if popup was dismissed in `sessionStorage`
- Ensure user is not already logged in

---

## API Endpoints

### Authentication Endpoints

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login with email/password
- `GET /api/auth/google` - Initiate Google OAuth
- `GET /api/auth/google/callback` - Google OAuth callback
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/me` - Get current user (protected)
- `POST /api/auth/logout` - Logout (protected)

---

## Database Schema

### User Collection

```javascript
{
  _id: ObjectId,
  email: String (unique, required),
  password: String (hashed, only for email/password users),
  name: String (required),
  picture: String (optional, profile image URL),
  googleId: String (unique, only for Google users),
  authProvider: 'google' | 'email' (required),
  isActive: Boolean (default: true),
  lastLoginAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

---

## Next Steps

1. ✅ Set up Google Cloud Console
2. ✅ Set up MongoDB Atlas
3. ✅ Configure environment variables
4. ✅ Install dependencies
5. ✅ Test authentication
6. ✅ Deploy to production

---

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review server logs for errors
3. Check browser console for frontend errors
4. Verify all environment variables are set correctly

---

**Last Updated**: 2024
**Prepared For**: The Lal Street

