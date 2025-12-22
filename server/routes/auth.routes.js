// server/routes/auth.routes.js
const express = require('express');
const router = express.Router();
const passport = require('passport');
const rateLimit = require('express-rate-limit');
const {
  register,
  login,
  googleCallback,
  refreshToken,
  getMe,
  logout
} = require('../controllers/auth.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const strictAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // 3 attempts per window (for login/register)
  message: {
    success: false,
    message: 'Too many attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Google OAuth Strategy Setup (only if credentials are configured)
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');
const logger = require('../utils/logger');

// Helper function to check if Google OAuth is configured (check at runtime)
const hasGoogleOAuth = () => {
  const hasClientId = !!process.env.GOOGLE_CLIENT_ID;
  const hasClientSecret = !!process.env.GOOGLE_CLIENT_SECRET;
  
  if (!hasClientId || !hasClientSecret) {
    logger.debug(`Google OAuth check: CLIENT_ID=${hasClientId}, CLIENT_SECRET=${hasClientSecret}`);
    logger.debug(`GOOGLE_CLIENT_ID value: ${process.env.GOOGLE_CLIENT_ID ? 'SET' : 'NOT SET'}`);
    logger.debug(`GOOGLE_CLIENT_SECRET value: ${process.env.GOOGLE_CLIENT_SECRET ? 'SET' : 'NOT SET'}`);
  }
  
  return hasClientId && hasClientSecret;
};

// Check if Google OAuth credentials are configured (at module load)
const googleOAuthConfigured = hasGoogleOAuth();

if (googleOAuthConfigured) {
  // Construct callback URL - must be absolute for Google OAuth
  let callbackURL = process.env.GOOGLE_CALLBACK_URL;
  if (!callbackURL) {
    // Fallback: construct from server URL or use default
    const serverUrl = process.env.SERVER_URL || process.env.RENDER_EXTERNAL_URL || 'http://localhost:5000';
    callbackURL = `${serverUrl}/api/auth/google/callback`;
  }
  
  logger.info(`Google OAuth callback URL: ${callbackURL}`);
  
  // Configure Google OAuth Strategy
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: callbackURL
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const user = await User.findOrCreateGoogleUser(profile);
      return done(null, user);
    } catch (error) {
      return done(error, null);
    }
  }));
  logger.info('Google OAuth strategy configured');
} else {
  logger.warn('Google OAuth credentials not configured. Google login will be disabled.');
  logger.warn('To enable Google OAuth, set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your .env file');
}

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user._id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id).select('-password');
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Routes

// POST /api/auth/register - Register new user
router.post('/register', strictAuthLimiter, register);

// POST /api/auth/login - Login with email/password
router.post('/login', strictAuthLimiter, login);

// GET /api/auth/google - Initiate Google OAuth
router.get('/google', (req, res, next) => {
  // Check at request time (in case env vars were loaded after module initialization)
  if (!hasGoogleOAuth()) {
    logger.warn('Google OAuth request received but credentials not configured');
    logger.warn(`GOOGLE_CLIENT_ID: ${process.env.GOOGLE_CLIENT_ID ? 'SET' : 'NOT SET'}`);
    logger.warn(`GOOGLE_CLIENT_SECRET: ${process.env.GOOGLE_CLIENT_SECRET ? 'SET' : 'NOT SET'}`);
    return res.status(503).json({
      success: false,
      message: 'Google OAuth is not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in environment variables.',
      debug: {
        hasClientId: !!process.env.GOOGLE_CLIENT_ID,
        hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
        clientIdLength: process.env.GOOGLE_CLIENT_ID?.length || 0
      }
    });
  }
  passport.authenticate('google', { 
    scope: ['profile', 'email'],
    session: false 
  })(req, res, next);
});

// GET /api/auth/google/callback - Google OAuth callback
router.get('/google/callback', (req, res, next) => {
  // Check at request time
  if (!hasGoogleOAuth()) {
    logger.warn('Google OAuth callback received but credentials not configured');
    return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}?error=oauth_not_configured`);
  }
  passport.authenticate('google', { 
    session: false,
    failureRedirect: `${process.env.FRONTEND_URL || 'http://localhost:5173'}?error=auth_failed`
  })(req, res, next);
}, googleCallback);

// POST /api/auth/refresh - Refresh access token
router.post('/refresh', authLimiter, refreshToken);

// GET /api/auth/me - Get current user (protected)
// No rate limiting on this endpoint - it's used frequently for auth status checks
router.get('/me', authenticateToken, getMe);

// POST /api/auth/logout - Logout
router.post('/logout', authenticateToken, logout);

module.exports = router;

