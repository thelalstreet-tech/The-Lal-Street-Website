// server/utils/urlValidator.js
/**
 * URL validation and sanitization utilities
 * Prevents open redirect vulnerabilities
 */

const logger = require('./logger');

/**
 * Validate and sanitize frontend URL
 * Prevents open redirect attacks by only allowing whitelisted domains
 */
const validateFrontendUrl = (url, allowedOrigins = []) => {
  if (!url) {
    return null;
  }

  // Handle comma-separated URLs - take first one
  const cleanUrl = url.split(',')[0].trim().replace(/['"]/g, '');
  
  if (!cleanUrl) {
    return null;
  }

  try {
    const urlObj = new URL(cleanUrl);
    
    // If allowedOrigins is provided, validate against whitelist
    if (allowedOrigins.length > 0) {
      const isAllowed = allowedOrigins.some(origin => {
        try {
          const originUrl = new URL(origin);
          return originUrl.origin === urlObj.origin;
        } catch {
          return false;
        }
      });
      
      if (!isAllowed) {
        logger.warn(`Frontend URL not in whitelist: ${cleanUrl}`);
        return null;
      }
    }
    
    // Only allow http/https protocols
    if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
      logger.warn(`Invalid protocol in frontend URL: ${urlObj.protocol}`);
      return null;
    }
    
    return cleanUrl;
  } catch (error) {
    logger.warn(`Invalid frontend URL format: ${cleanUrl}`, error.message);
    return null;
  }
};

/**
 * Get safe frontend URL with fallback
 */
const getSafeFrontendUrl = (fallback = 'http://localhost:5173') => {
  const frontendUrl = process.env.FRONTEND_URL;
  const allowedOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
    : [];
  
  const validated = validateFrontendUrl(frontendUrl, allowedOrigins);
  return validated || fallback;
};

/**
 * Validate callback URL format
 */
const validateCallbackUrl = (url) => {
  if (!url) {
    return false;
  }
  
  try {
    const urlObj = new URL(url);
    
    // Must be absolute URL
    if (!urlObj.protocol || !urlObj.hostname) {
      return false;
    }
    
    // Only allow http/https
    if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
      return false;
    }
    
    // In production, must be HTTPS
    if (process.env.NODE_ENV === 'production' && urlObj.protocol !== 'https:') {
      return false;
    }
    
    return true;
  } catch {
    return false;
  }
};

module.exports = {
  validateFrontendUrl,
  getSafeFrontendUrl,
  validateCallbackUrl
};

