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

// Store callback URL at module level so we can access it in route handlers
let configuredCallbackURL = null;

if (googleOAuthConfigured) {
  // Construct callback URL - must be absolute for Google OAuth
  // Priority: GOOGLE_CALLBACK_URL env var > SERVER_URL + /api/auth/google/callback > RENDER_EXTERNAL_URL > localhost
  let callbackURL = process.env.GOOGLE_CALLBACK_URL;
  
  if (!callbackURL) {
    // Try to construct from available environment variables
    let serverUrl = process.env.SERVER_URL || process.env.RENDER_EXTERNAL_URL;
    
    if (serverUrl) {
      // Ensure serverUrl doesn't have trailing slash
      const cleanServerUrl = serverUrl.replace(/\/$/, '');
      // Force HTTPS in production (Render uses HTTPS)
      if (process.env.NODE_ENV === 'production' && cleanServerUrl.startsWith('http://')) {
        serverUrl = cleanServerUrl.replace('http://', 'https://');
        logger.warn(`Forced HTTPS for callback URL in production: ${serverUrl}`);
      } else {
        serverUrl = cleanServerUrl;
      }
      callbackURL = `${serverUrl}/api/auth/google/callback`;
    } else {
      // Fallback to localhost for development
      callbackURL = 'http://localhost:5000/api/auth/google/callback';
    }
  }
  
  // Ensure callback URL is absolute (starts with http:// or https://)
  if (!callbackURL.startsWith('http://') && !callbackURL.startsWith('https://')) {
    logger.error(`Invalid callback URL format: ${callbackURL}. Must be absolute URL.`);
    callbackURL = 'http://localhost:5000/api/auth/google/callback';
  }
  
  // In production, ensure HTTPS (Render always uses HTTPS)
  if (process.env.NODE_ENV === 'production' && callbackURL.startsWith('http://')) {
    callbackURL = callbackURL.replace('http://', 'https://');
    logger.warn(`Forced HTTPS for callback URL in production: ${callbackURL}`);
  }
  
  // Store the final callback URL for use in route handlers
  configuredCallbackURL = callbackURL;
  
  logger.info(`Google OAuth callback URL: ${callbackURL}`);
  logger.info(`Make sure this URL matches exactly in Google Cloud Console: ${callbackURL}`);
  logger.info(`Environment check - GOOGLE_CALLBACK_URL: ${process.env.GOOGLE_CALLBACK_URL || 'NOT SET'}`);
  logger.info(`Environment check - SERVER_URL: ${process.env.SERVER_URL || 'NOT SET'}`);
  logger.info(`Environment check - RENDER_EXTERNAL_URL: ${process.env.RENDER_EXTERNAL_URL || 'NOT SET'}`);
  
  // Configure Google OAuth Strategy
  // Note: The callbackURL must match EXACTLY what's in Google Cloud Console
  // including protocol (https), domain, path, and no trailing slash
  // CRITICAL: This callbackURL is used in BOTH the authorization request AND token exchange
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: callbackURL,
    // Ensure redirect_uri is included in token exchange
    passReqToCallback: false
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const user = await User.findOrCreateGoogleUser(profile);
      return done(null, user);
    } catch (error) {
      logger.error('Google OAuth user creation error:', error);
      return done(error, null);
    }
  }));
  logger.info('Google OAuth strategy configured successfully');
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
  
  // Log callback details for debugging
  logger.info(`Google OAuth callback received. Query params: ${JSON.stringify(req.query)}`);
  logger.info(`Request URL: ${req.protocol}://${req.get('host')}${req.originalUrl}`);
  logger.info(`Full request URL: ${req.url}`);
  logger.info(`Configured callback URL: ${configuredCallbackURL || process.env.GOOGLE_CALLBACK_URL || 'Not available'}`);
  
  // Use the stored callback URL or fallback to env var
  const callbackURLForLogging = configuredCallbackURL || process.env.GOOGLE_CALLBACK_URL || 'Not configured';
  
  // CRITICAL: Extract the base callback URL (without query params) to compare
  // The redirect_uri in token exchange must match the base URL exactly
  // Use req.originalUrl to get the full path including mount prefix
  const fullPath = req.originalUrl.split('?')[0]; // Remove query params
  const baseCallbackURL = `${req.protocol}://${req.get('host')}${fullPath}`;
  logger.info(`Base callback URL from request: ${baseCallbackURL}`);
  logger.info(`Expected callback URL: ${callbackURLForLogging}`);
  logger.info(`Request path (route): ${req.path}`);
  logger.info(`Request originalUrl: ${req.originalUrl}`);
  logger.info(`Full path (no query): ${fullPath}`);
  
  // Verify the request URL matches our configured callback URL
  if (baseCallbackURL !== callbackURLForLogging) {
    logger.error(`❌ CRITICAL MISMATCH: Request URL doesn't match configured callback URL!`);
    logger.error(`   Request URL: ${baseCallbackURL}`);
    logger.error(`   Configured URL: ${callbackURLForLogging}`);
    logger.error(`   This WILL cause redirect_uri mismatch in token exchange!`);
    logger.error(`   Passport will send: ${baseCallbackURL}`);
    logger.error(`   But Google expects: ${callbackURLForLogging}`);
  } else {
    logger.info(`✅ Callback URL matches: ${baseCallbackURL}`);
  }
  
  passport.authenticate('google', { 
    session: false
  }, (err, user, info) => {
    // Custom callback to handle errors and success
    if (err) {
      logger.error('Google OAuth authentication error:', err);
      logger.error('Error details:', {
        message: err.message,
        name: err.name,
        stack: err.stack
      });
      // Check for specific error types
      if (err.code === 'invalid_grant') {
        logger.error('═══════════════════════════════════════════════════════');
        logger.error('INVALID_GRANT ERROR - DIAGNOSTIC INFORMATION');
        logger.error('═══════════════════════════════════════════════════════');
        logger.error('This error usually means:');
        logger.error('1. Redirect URI mismatch - The redirect_uri in token exchange must match authorization');
        logger.error('2. Authorization code expired (codes expire in ~10 minutes)');
        logger.error('3. Authorization code already used');
        logger.error('4. Client ID/Secret mismatch');
        logger.error('');
        logger.error('Current Configuration:');
        logger.error(`  GOOGLE_CALLBACK_URL env var: ${process.env.GOOGLE_CALLBACK_URL || 'NOT SET'}`);
        logger.error(`  SERVER_URL env var: ${process.env.SERVER_URL || 'NOT SET'}`);
        logger.error(`  RENDER_EXTERNAL_URL env var: ${process.env.RENDER_EXTERNAL_URL || 'NOT SET'}`);
        logger.error(`  Configured callback URL: ${callbackURLForLogging}`);
        logger.error(`  Base callback URL from request: ${baseCallbackURL}`);
        logger.error(`  Full request URL: ${req.protocol}://${req.get('host')}${req.originalUrl}`);
        logger.error(`  Request path (route): ${req.path}`);
        logger.error(`  Request originalUrl: ${req.originalUrl}`);
        logger.error(`  Full path (no query): ${fullPath}`);
        logger.error(`  Request host: ${req.get('host')}`);
        logger.error(`  Request protocol: ${req.protocol}`);
        if (baseCallbackURL !== callbackURLForLogging) {
          logger.error(`  ❌ CRITICAL MISMATCH: Request URL doesn't match configured URL!`);
          logger.error(`     This is likely causing the invalid_grant error!`);
          logger.error(`     Passport will send redirect_uri: ${baseCallbackURL}`);
          logger.error(`     But Google expects: ${callbackURLForLogging}`);
        }
        logger.error('');
        logger.error('ROOT CAUSE ANALYSIS:');
        logger.error('The redirect_uri sent in token exchange must match EXACTLY:');
        logger.error('1. What was used in the authorization request');
        logger.error('2. What is registered in Google Cloud Console');
        logger.error('');
        logger.error('ACTION REQUIRED:');
        logger.error('1. Go to Google Cloud Console → APIs & Services → Credentials');
        logger.error('2. Find your OAuth 2.0 Client ID');
        logger.error('3. Under "Authorized redirect URIs", ensure this EXACT URL is listed:');
        logger.error(`   ${callbackURLForLogging}`);
        logger.error('4. The URL must match EXACTLY (case-sensitive, no trailing slash, must be https://)');
        logger.error('5. Save changes and wait 1-2 minutes for propagation');
        logger.error('═══════════════════════════════════════════════════════');
      }
      if (err.message && err.message.includes('redirect_uri_mismatch')) {
        logger.error('CALLBACK URL MISMATCH! Check that GOOGLE_CALLBACK_URL matches Google Cloud Console');
        logger.error(`Current callback URL: ${process.env.GOOGLE_CALLBACK_URL || 'Not set - using constructed URL'}`);
      }
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}?error=auth_failed&details=${encodeURIComponent(err.message)}`);
    }
    if (!user) {
      logger.warn('Google OAuth authentication failed - no user returned');
      logger.warn('Info:', info);
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}?error=auth_failed`);
    }
    // Attach user to request and call googleCallback handler directly
    req.user = user;
    googleCallback(req, res, next);
  })(req, res, next);
});

// POST /api/auth/refresh - Refresh access token
router.post('/refresh', authLimiter, refreshToken);

// GET /api/auth/me - Get current user (protected)
// No rate limiting on this endpoint - it's used frequently for auth status checks
router.get('/me', authenticateToken, getMe);

// POST /api/auth/logout - Logout
router.post('/logout', authenticateToken, logout);

module.exports = router;

