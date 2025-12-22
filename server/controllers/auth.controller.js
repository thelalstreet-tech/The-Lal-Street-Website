// server/controllers/auth.controller.js
const User = require('../models/User');
const mongoose = require('mongoose');
const { generateTokens } = require('../utils/jwt');
const logger = require('../utils/logger');
const { getSafeFrontendUrl } = require('../utils/urlValidator');

// Helper to check if database is connected
const isDatabaseConnected = () => {
  return mongoose.connection.readyState === 1; // 1 = connected
};

/**
 * Register new user with email/password
 */
const register = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database is not available. Please configure MONGODB_URI in your environment variables.'
      });
    }

    const { email, password, name } = req.body;

    // Validation
    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        message: 'Email, password, and name are required'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Create user
    const user = await User.create({
      email: email.toLowerCase(),
      password,
      name,
      authProvider: 'email',
      lastLoginAt: new Date()
    });

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user);

    // Set tokens in httpOnly cookies (secure, not accessible via JavaScript)
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000, // 15 minutes (matches access token expiry)
    };

    const refreshCookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    };

    res.cookie('accessToken', accessToken, cookieOptions);
    res.cookie('refreshToken', refreshToken, refreshCookieOptions);

    logger.info(`New user registered: ${user.email}`);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          picture: user.picture,
          authProvider: user.authProvider
        },
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    logger.error('Registration error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error registering user',
      error: error.message
    });
  }
};

/**
 * Login with email/password
 */
const login = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database is not available. Please configure MONGODB_URI in your environment variables.'
      });
    }

    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account is inactive'
      });
    }

    // Verify password (only for email/password users)
    if (user.authProvider === 'email') {
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }
    } else {
      // User registered with Google, trying to login with password
      return res.status(401).json({
        success: false,
        message: 'This account uses Google login. Please use "Login with Google"'
      });
    }

    // Update last login
    user.lastLoginAt = new Date();
    await user.save();

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user);

    // Set tokens in httpOnly cookies (secure, not accessible via JavaScript)
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000, // 15 minutes (matches access token expiry)
    };

    const refreshCookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    };

    res.cookie('accessToken', accessToken, cookieOptions);
    res.cookie('refreshToken', refreshToken, refreshCookieOptions);

    logger.info(`User logged in: ${user.email}`);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          picture: user.picture,
          authProvider: user.authProvider
        },
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    logger.error('Login error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error logging in',
      error: error.message
    });
  }
};

/**
 * Google OAuth callback handler
 * Industry best practice: Set tokens in httpOnly cookies and redirect to clean URL
 */
const googleCallback = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      const frontendUrl = getSafeFrontendUrl();
      return res.redirect(`${frontendUrl}?error=database_unavailable`);
    }

    const user = req.user; // Set by passport middleware

    if (!user) {
      logger.error('Google OAuth callback: No user object in request');
      logger.error('Request user:', req.user);
      logger.error('Request session:', req.session);
      const frontendUrl = getSafeFrontendUrl();
      return res.redirect(`${frontendUrl}?error=auth_failed`);
    }
    
    // Validate user data
    if (!user.email || !user._id) {
      logger.error('Google OAuth callback: Invalid user data', { 
        userId: user._id, 
        email: user.email,
        userObject: JSON.stringify(user)
      });
      const frontendUrl = getSafeFrontendUrl();
      return res.redirect(`${frontendUrl}?error=auth_failed`);
    }
    
    logger.info(`Google OAuth callback: User authenticated - ${user.email} (${user._id})`);

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user);

    // Set tokens in httpOnly cookies (most secure - tokens never exposed to JavaScript)
    const cookieOptions = {
      httpOnly: true, // Prevents JavaScript access (XSS protection)
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      sameSite: 'lax', // CSRF protection
      maxAge: 15 * 60 * 1000, // 15 minutes (matches access token expiry)
    };

    const refreshCookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days (matches refresh token expiry)
    };

    res.cookie('accessToken', accessToken, cookieOptions);
    res.cookie('refreshToken', refreshToken, refreshCookieOptions);

    logger.info(`Google OAuth login successful for: ${user.email}`);

    // Redirect to clean URL (home page) - no tokens in URL
    // Frontend will automatically detect cookies and fetch user info
    const frontendUrl = getSafeFrontendUrl();
    res.redirect(frontendUrl);
  } catch (error) {
    logger.error('Google OAuth callback error:', error.message);
    logger.error('Stack trace:', error.stack);
    const frontendUrl = getSafeFrontendUrl();
    res.redirect(`${frontendUrl}?error=auth_failed`);
  }
};

/**
 * Refresh access token using refresh token
 */
const refreshToken = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database is not available. Please configure MONGODB_URI in your environment variables.'
      });
    }

    const { refreshToken: token } = req.body;
    const cookieToken = req.cookies?.refreshToken;

    const refreshTokenValue = token || cookieToken;

    if (!refreshTokenValue) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token is required'
      });
    }

    const { verifyRefreshToken, generateAccessToken } = require('../utils/jwt');
    const decoded = verifyRefreshToken(refreshTokenValue);

    // Get user
    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User not found or inactive'
      });
    }

    // Generate new access token
    const accessToken = generateAccessToken({
      userId: user._id.toString(),
      email: user.email
    });

    res.json({
      success: true,
      data: {
        accessToken
      }
    });
  } catch (error) {
    logger.warn('Token refresh error:', error.message);
    res.status(401).json({
      success: false,
      message: 'Invalid or expired refresh token'
    });
  }
};

/**
 * Get current user info
 */
const getMe = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database is not available. Please configure MONGODB_URI in your environment variables.'
      });
    }

    const user = req.user; // Set by authenticateToken middleware

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          picture: user.picture,
          authProvider: user.authProvider,
          lastLoginAt: user.lastLoginAt
        }
      }
    });
  } catch (error) {
    logger.error('Get me error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error fetching user info'
    });
  }
};

/**
 * Logout (clear tokens)
 */
const logout = async (req, res) => {
  try {
    // Clear both token cookies
    res.clearCookie('accessToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    logger.error('Logout error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error logging out'
    });
  }
};

module.exports = {
  register,
  login,
  googleCallback,
  refreshToken,
  getMe,
  logout
};

