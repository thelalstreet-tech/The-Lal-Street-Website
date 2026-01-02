// server/config/cloudinary.js
const cloudinary = require('cloudinary').v2;
const logger = require('../utils/logger');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload image to Cloudinary
 * @param {Buffer|string} file - File buffer or file path
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} Upload result with secure_url
 */
const uploadImage = async (file, options = {}) => {
  try {
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      throw new Error('Cloudinary credentials not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET environment variables.');
    }

    const uploadOptions = {
      folder: 'the-lal-street/blogs',
      resource_type: 'image',
      ...options,
    };

    const result = await cloudinary.uploader.upload(file, uploadOptions);
    
    logger.info(`Image uploaded to Cloudinary: ${result.secure_url}`);
    
    return {
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
    };
  } catch (error) {
    logger.error('Error uploading image to Cloudinary:', error.message);
    throw error;
  }
};

/**
 * Delete image from Cloudinary
 * @param {string} publicId - Cloudinary public ID
 * @returns {Promise<Object>} Deletion result
 */
const deleteImage = async (publicId) => {
  try {
    if (!publicId) {
      return { result: 'ok' };
    }

    const result = await cloudinary.uploader.destroy(publicId);
    logger.info(`Image deleted from Cloudinary: ${publicId}`);
    return result;
  } catch (error) {
    logger.error('Error deleting image from Cloudinary:', error.message);
    throw error;
  }
};

module.exports = {
  uploadImage,
  deleteImage,
  cloudinary,
};


