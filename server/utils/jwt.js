// server/utils/jwt.js
const jwt = require('jsonwebtoken');
const logger = require('./logger');

// Validate JWT secrets - must be set in production
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

if (!JWT_SECRET || JWT_SECRET === 'your-secret-key-change-in-production') {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set in production environment');
  }
  logger.warn('Using default JWT_SECRET - change in production!');
}

if (!JWT_REFRESH_SECRET || JWT_REFRESH_SECRET === 'your-refresh-secret-key-change-in-production') {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_REFRESH_SECRET must be set in production environment');
  }
  logger.warn('Using default JWT_REFRESH_SECRET - change in production!');
}

// Minimum secret length check
if (JWT_SECRET && JWT_SECRET.length < 32) {
  logger.warn('JWT_SECRET is too short (minimum 32 characters recommended)');
}

if (JWT_REFRESH_SECRET && JWT_REFRESH_SECRET.length < 32) {
  logger.warn('JWT_REFRESH_SECRET is too short (minimum 32 characters recommended)');
}

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

// Use fallback only in development
const getJWTSecret = () => JWT_SECRET || 'your-secret-key-change-in-production';
const getJWTRefreshSecret = () => JWT_REFRESH_SECRET || 'your-refresh-secret-key-change-in-production';

/**
 * Generate access token (short-lived)
 */
const generateAccessToken = (payload) => {
  if (!payload.userId || !payload.email) {
    throw new Error('Invalid payload: userId and email are required');
  }
  return jwt.sign(
    { 
      userId: payload.userId,
      email: payload.email 
    },
    getJWTSecret(),
    { 
      expiresIn: JWT_EXPIRES_IN 
    }
  );
};

/**
 * Generate refresh token (long-lived)
 */
const generateRefreshToken = (payload) => {
  if (!payload.userId || !payload.email) {
    throw new Error('Invalid payload: userId and email are required');
  }
  return jwt.sign(
    { 
      userId: payload.userId,
      email: payload.email,
      type: 'refresh'
    },
    getJWTRefreshSecret(),
    { 
      expiresIn: JWT_REFRESH_EXPIRES_IN 
    }
  );
};

/**
 * Verify access token
 */
const verifyAccessToken = (token) => {
  if (!token) {
    throw new Error('Token is required');
  }
  try {
    return jwt.verify(token, getJWTSecret());
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token expired');
    }
    throw new Error('Invalid token');
  }
};

/**
 * Verify refresh token
 */
const verifyRefreshToken = (token) => {
  if (!token) {
    throw new Error('Refresh token is required');
  }
  try {
    const decoded = jwt.verify(token, getJWTRefreshSecret());
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }
    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Refresh token expired');
    }
    throw new Error('Invalid refresh token');
  }
};

/**
 * Generate both tokens
 */
const generateTokens = (user) => {
  const payload = {
    userId: user._id.toString(),
    email: user.email
  };

  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload)
  };
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  generateTokens,
  verifyAccessToken,
  verifyRefreshToken
};

