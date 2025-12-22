// server/utils/envValidator.js
/**
 * Environment variable validation
 * Ensures all required environment variables are set correctly
 */

const logger = require('./logger');

/**
 * Validate critical environment variables
 */
const validateEnvironment = () => {
  const errors = [];
  const warnings = [];

  // Required in all environments
  if (!process.env.MONGODB_URI) {
    errors.push('MONGODB_URI is required');
  }

  // Required in production
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'your-secret-key-change-in-production') {
      errors.push('JWT_SECRET must be set in production');
    }
    
    if (!process.env.JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET === 'your-refresh-secret-key-change-in-production') {
      errors.push('JWT_REFRESH_SECRET must be set in production');
    }
    
    if (!process.env.FRONTEND_URL) {
      warnings.push('FRONTEND_URL should be set in production');
    }
  }

  // Google OAuth validation
  const hasGoogleClientId = !!process.env.GOOGLE_CLIENT_ID;
  const hasGoogleClientSecret = !!process.env.GOOGLE_CLIENT_SECRET;
  
  if (hasGoogleClientId && !hasGoogleClientSecret) {
    errors.push('GOOGLE_CLIENT_ID is set but GOOGLE_CLIENT_SECRET is missing');
  }
  
  if (hasGoogleClientSecret && !hasGoogleClientId) {
    errors.push('GOOGLE_CLIENT_SECRET is set but GOOGLE_CLIENT_ID is missing');
  }
  
  if (hasGoogleClientId && hasGoogleClientSecret) {
    // Validate Client ID format
    if (!process.env.GOOGLE_CLIENT_ID.includes('.apps.googleusercontent.com')) {
      warnings.push('GOOGLE_CLIENT_ID format may be incorrect (should end with .apps.googleusercontent.com)');
    }
    
    // Validate callback URL if set
    if (process.env.GOOGLE_CALLBACK_URL) {
      try {
        const url = new URL(process.env.GOOGLE_CALLBACK_URL);
        if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') {
          warnings.push('GOOGLE_CALLBACK_URL should use HTTPS in production');
        }
      } catch (error) {
        errors.push(`GOOGLE_CALLBACK_URL is invalid: ${error.message}`);
      }
    }
  }

  // JWT secret strength validation
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    warnings.push('JWT_SECRET is too short (minimum 32 characters recommended for security)');
  }
  
  if (process.env.JWT_REFRESH_SECRET && process.env.JWT_REFRESH_SECRET.length < 32) {
    warnings.push('JWT_REFRESH_SECRET is too short (minimum 32 characters recommended for security)');
  }

  // Log errors and warnings
  if (errors.length > 0) {
    logger.error('Environment validation errors:');
    errors.forEach(error => logger.error(`  - ${error}`));
    throw new Error(`Environment validation failed: ${errors.join(', ')}`);
  }

  if (warnings.length > 0) {
    logger.warn('Environment validation warnings:');
    warnings.forEach(warning => logger.warn(`  - ${warning}`));
  }

  logger.info('Environment validation passed');
};

module.exports = {
  validateEnvironment
};

