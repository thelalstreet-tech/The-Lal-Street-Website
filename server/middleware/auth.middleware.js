// server/middleware/auth.middleware.js
const { verifyAccessToken } = require('../utils/jwt');
const User = require('../models/User');
const logger = require('../utils/logger');

/**
 * Middleware to authenticate user via JWT token
 * Adds user object to req.user if authenticated
 */
const authenticateToken = async (req, res, next) => {
  const DEBUG = process.env.NODE_ENV !== 'production'; // Debug in dev
  const logPrefix = '[authenticateToken]';
  
  try {
    // Get token from Authorization header or cookie
    // IMPORTANT: Check cookies FIRST if both are present, because:
    // 1. Cookies are set by backend (more reliable)
    // 2. localStorage tokens might be expired
    // 3. Google OAuth uses cookies, email/password can use either
    const authHeader = req.headers.authorization;
    let token = null;
    let tokenSource = null;

    // Prioritize cookies over Authorization header (cookies are more reliable)
    if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
      tokenSource = 'Cookie';
    } else if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
      tokenSource = 'Authorization header';
    }

    if (DEBUG) {
      logger.debug(`${logPrefix} Token check:`, {
        hasAuthHeader: !!authHeader,
        hasCookies: !!req.cookies,
        cookieKeys: req.cookies ? Object.keys(req.cookies) : [],
        tokenSource,
        hasToken: !!token,
        tokenLength: token ? token.length : 0
      });
    }

    if (!token) {
      if (DEBUG) {
        logger.debug(`${logPrefix} No token found. Headers:`, {
          authorization: authHeader ? 'present' : 'missing',
          cookies: req.cookies ? Object.keys(req.cookies) : 'none',
          cookieParser: typeof req.cookies
        });
      }
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please login.'
      });
    }

    // Verify token
    let decoded;
    try {
      decoded = verifyAccessToken(token);
      if (DEBUG) {
        logger.debug(`${logPrefix} Token verified:`, {
          userId: decoded.userId,
          email: decoded.email
        });
      }
    } catch (verifyError) {
      if (DEBUG) {
        logger.debug(`${logPrefix} Token verification failed:`, {
          error: verifyError.message,
          tokenSource
        });
      }
      throw verifyError;
    }

    // Get user from database
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user || !user.isActive) {
      if (DEBUG) {
        logger.debug(`${logPrefix} User not found or inactive:`, {
          userId: decoded.userId,
          userExists: !!user,
          isActive: user?.isActive
        });
      }
      return res.status(401).json({
        success: false,
        message: 'User not found or inactive'
      });
    }

    if (DEBUG) {
      logger.debug(`${logPrefix} ✅ Authentication successful:`, {
        userId: user._id,
        email: user.email
      });
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    logger.warn(`${logPrefix} Authentication error:`, error.message);
    
    if (error.message === 'Token expired') {
      return res.status(401).json({
        success: false,
        message: 'Token expired. Please refresh your session.'
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};

/**
 * Optional authentication middleware
 * Doesn't fail if no token, but adds user if token is valid
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    let token = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }

    if (token) {
      try {
        const decoded = verifyAccessToken(token);
        const user = await User.findById(decoded.userId).select('-password');
        if (user && user.isActive) {
          req.user = user;
        }
      } catch (error) {
        // Token invalid, but continue without user
        logger.debug('Optional auth failed:', error.message);
      }
    }

    next();
  } catch (error) {
    // Continue even if there's an error
    next();
  }
};

module.exports = {
  authenticateToken,
  optionalAuth
};

