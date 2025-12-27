## 7. Environment Variables

### 7.1 Frontend Environment Variables

**Location:** `.env` file in `client/` directory (for local development)

**File:** `client/.env` (not committed to Git - use `.env.example`)

**Variables:**

```env
# API Base URL (Required for production)
VITE_API_URL=https://the-lal-street-1.onrender.com/api

# Development Mode (auto-detected)
VITE_MODE=development
```

**Environment-Specific Values:**

**Development (Local):**
```env
VITE_API_URL=http://localhost:5000/api
```

**Production (Vercel):**
```env
VITE_API_URL=https://the-lal-street-1.onrender.com/api
```

**Usage in Code:**
```typescript
// client/src/config/api.ts
export const API_BASE_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.MODE === 'production' 
    ? 'https://the-lal-street-1.onrender.com/api'
    : 'http://localhost:5000/api');
```

**Vercel Configuration:**
- Set in Vercel Dashboard → Project Settings → Environment Variables
- Available for all environments (Production, Preview, Development)

---

### 7.2 Backend Environment Variables

**Location:** `.env` file in `server/` directory (for local development)

**File:** `server/.env` (not committed to Git - use `.env.example`)

**Variables:**

```env
# Server Configuration
PORT=5000
NODE_ENV=production

# CORS Configuration (Comma-separated origins)
ALLOWED_ORIGINS=https://the-lal-street.vercel.app,http://localhost:5173

# Admin Authentication
ADMIN_PASSWORD=your-secure-password-here

# External API Keys (if needed)
RAPIDAPI_KEY=your-rapidapi-key-here
```

**Variable Descriptions:**

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `5000` | Server port number (Render auto-assigns) |
| `NODE_ENV` | Yes | `production` | Environment mode (production/development) |
| `ALLOWED_ORIGINS` | Yes | `http://localhost:5173` | CORS allowed origins (comma-separated) |
| `ADMIN_PASSWORD` | Yes | - | Password for admin authentication |
| `RAPIDAPI_KEY` | No | - | API key for RapidAPI services (if used) |

**Render Configuration:**
- Set in Render Dashboard → Service → Environment
- Can be configured per environment (Production/Preview)
- Values are encrypted at rest

---

### 7.3 Environment Variable Setup

#### 7.3.1 Local Development Setup

**Frontend:**
1. Create `client/.env` file:
   ```bash
   cd client
   touch .env
   ```
2. Add variables:
   ```env
   VITE_API_URL=http://localhost:5000/api
   ```
3. Restart dev server if running

**Backend:**
1. Create `server/.env` file:
   ```bash
   cd server
   touch .env
   ```
2. Add variables:
   ```env
   PORT=5000
   NODE_ENV=development
   ALLOWED_ORIGINS=http://localhost:5173
   ADMIN_PASSWORD=dev-password-123
   ```
3. Restart server

**Git Ignore:**
Ensure `.env` files are in `.gitignore`:
```gitignore
# Environment variables
.env
.env.local
.env.production
.env.*.local
```

---

#### 7.3.2 Vercel (Frontend) Setup

**Via Dashboard:**
1. Go to Vercel Dashboard
2. Select your project
3. Go to Settings → Environment Variables
4. Add variables:
   - Key: `VITE_API_URL`
   - Value: `https://the-lal-street-1.onrender.com/api`
   - Environment: Production, Preview, Development
5. Save and redeploy

**Via CLI:**
```bash
vercel env add VITE_API_URL production
# Enter value when prompted
```

**Check Variables:**
```bash
vercel env ls
```

---

#### 7.3.3 Render (Backend) Setup

**Via Dashboard:**
1. Go to Render Dashboard
2. Select your service
3. Go to Environment tab
4. Add variables one by one:
   - `NODE_ENV` = `production`
   - `ALLOWED_ORIGINS` = `https://your-app.vercel.app,http://localhost:5173`
   - `ADMIN_PASSWORD` = `your-secure-password`
5. Service will auto-restart after changes

**Via `render.yaml`:**
```yaml
envVars:
  - key: NODE_ENV
    value: production
  - key: ALLOWED_ORIGINS
    value: https://your-app.vercel.app
```

**Note:** Secrets like `ADMIN_PASSWORD` should be set manually, not in YAML

---

### 7.4 Environment Variable Examples

#### 7.4.1 Development Environment

**Frontend (`client/.env`):**
```env
VITE_API_URL=http://localhost:5000/api
```

**Backend (`server/.env`):**
```env
PORT=5000
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
ADMIN_PASSWORD=dev-admin-123
RAPIDAPI_KEY=dev-key-if-needed
```

#### 7.4.2 Production Environment

**Frontend (Vercel):**
```env
VITE_API_URL=https://the-lal-street-1.onrender.com/api
```

**Backend (Render):**
```env
NODE_ENV=production
ALLOWED_ORIGINS=https://the-lal-street.vercel.app
ADMIN_PASSWORD=secure-production-password-here
RAPIDAPI_KEY=production-api-key
```

---

### 7.5 Security Best Practices

**Do:**
- ✅ Use strong, unique passwords for `ADMIN_PASSWORD`
- ✅ Keep `.env` files in `.gitignore`
- ✅ Use different passwords for dev and production
- ✅ Rotate passwords periodically
- ✅ Use environment variables for all secrets
- ✅ Encrypt sensitive values in production

**Don't:**
- ❌ Commit `.env` files to Git
- ❌ Share environment variables in chat/email
- ❌ Use default or weak passwords
- ❌ Hardcode secrets in source code
- ❌ Log environment variable values

---

### 7.6 Troubleshooting

**Issue: Environment Variables Not Working**

**Frontend:**
- Variables must start with `VITE_` to be exposed to client
- Restart dev server after adding variables
- Check variable names match exactly (case-sensitive)
- Verify variables are set in Vercel dashboard

**Backend:**
- Check `.env` file is in correct directory (`server/`)
- Restart server after adding variables
- Verify variables are set in Render dashboard
- Check for typos in variable names

**Issue: CORS Errors**
- Verify `ALLOWED_ORIGINS` includes your frontend URL
- Check for trailing slashes (should be: `https://app.vercel.app`)
- Ensure comma-separated format is correct
- Restart backend after changing CORS settings

**Issue: Admin Login Fails**
- Verify `ADMIN_PASSWORD` matches on backend
- Check for extra spaces or hidden characters
- Ensure password is set in Render environment variables
- Clear browser localStorage and re-login

---

### 7.7 Environment Variable Reference

**Complete List:**

**Frontend (Client):**
- `VITE_API_URL` - Backend API base URL

**Backend (Server):**
- `PORT` - Server port (default: 5000)
- `NODE_ENV` - Environment mode (production/development)
- `ALLOWED_ORIGINS` - CORS allowed origins (comma-separated)
- `ADMIN_PASSWORD` - Admin authentication password
- `RAPIDAPI_KEY` - Optional RapidAPI key

**Optional/Future:**
- `DATABASE_URL` - Database connection string (if migrated)
- `REDIS_URL` - Redis connection (if caching added)
- `SESSION_SECRET` - Session encryption key (if sessions added)
- `JWT_SECRET` - JWT token secret (if JWT implemented)

---

### 7.8 Migration Checklist

When setting up a new environment:

- [ ] Copy `.env.example` to `.env`
- [ ] Fill in all required variables
- [ ] Set strong passwords
- [ ] Configure CORS origins
- [ ] Test locally first
- [ ] Set variables in hosting platform
- [ ] Verify values are correct
- [ ] Test deployment
- [ ] Remove `.env` from Git (if accidentally committed)


