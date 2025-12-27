// server/services/suggestedBuckets.service.js
const mongoose = require('mongoose');
const SuggestedBucket = require('../models/SuggestedBucket');
const logger = require('../utils/logger');

/**
 * Check if database is connected
 * @returns {boolean}
 */
const isDatabaseConnected = () => {
  return mongoose.connection.readyState === 1; // 1 = connected
};

/**
 * Get all suggested buckets
 * @param {boolean} activeOnly - If true, return only active buckets
 * @returns {Promise<Array>}
 */
const getAllSuggestedBuckets = async (activeOnly = false) => {
  try {
    if (!isDatabaseConnected()) {
      logger.warn('Database not connected, returning empty array for suggested buckets');
      return [];
    }

    const query = activeOnly ? { isActive: true } : {};
    const buckets = await SuggestedBucket.find(query)
      .sort({ createdAt: -1 })
      .lean(); // Use lean() for better performance
    
    // Convert MongoDB _id to id for backward compatibility
    return buckets.map(bucket => ({
      ...bucket,
      id: bucket._id.toString(),
      _id: undefined
    }));
  } catch (error) {
    logger.error('Error getting all suggested buckets:', error.message);
    logger.error('Error stack:', error.stack);
    return [];
  }
};

/**
 * Get a single suggested bucket by ID
 * @param {string} bucketId - MongoDB ObjectId or string ID
 * @returns {Promise<Object|null>}
 */
const getSuggestedBucketById = async (bucketId) => {
  try {
    if (!isDatabaseConnected()) {
      logger.warn('Database not connected, cannot fetch suggested bucket');
      return null;
    }

    // Check if bucketId is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(bucketId)) {
      logger.warn(`Invalid bucket ID format: ${bucketId}`);
      return null;
    }

    const bucket = await SuggestedBucket.findById(bucketId).lean();
    
    if (!bucket) {
      return null;
    }

    // Convert MongoDB _id to id for backward compatibility
    return {
      ...bucket,
      id: bucket._id.toString(),
      _id: undefined
    };
  } catch (error) {
    logger.error('Error getting suggested bucket by ID:', error.message);
    logger.error('Error stack:', error.stack);
    return null;
  }
};

/**
 * Add a new suggested bucket
 * @param {Object} bucketData - Bucket data (without id, createdAt, updatedAt)
 * @returns {Promise<Object>} Created bucket with generated fields
 */
const addSuggestedBucket = async (bucketData) => {
  try {
    if (!isDatabaseConnected()) {
      throw new Error('Database not connected. Cannot create suggested bucket.');
    }

    // Remove id if present (MongoDB will generate _id)
    const { id, ...cleanBucketData } = bucketData;

    const newBucket = new SuggestedBucket(cleanBucketData);
    await newBucket.save();

    logger.info(`Added new suggested bucket: ${newBucket._id}`);

    // Convert MongoDB _id to id for backward compatibility
    return {
      ...newBucket.toObject(),
      id: newBucket._id.toString(),
      _id: undefined
    };
  } catch (error) {
    logger.error('Error adding suggested bucket:', error.message);
    logger.error('Error stack:', error.stack);
    throw error;
  }
};

/**
 * Update an existing suggested bucket
 * @param {string} bucketId - MongoDB ObjectId or string ID
 * @param {Object} updates - Partial bucket data to update
 * @returns {Promise<Object|null>} Updated bucket or null if not found
 */
const updateSuggestedBucket = async (bucketId, updates) => {
  try {
    if (!isDatabaseConnected()) {
      throw new Error('Database not connected. Cannot update suggested bucket.');
    }

    // Check if bucketId is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(bucketId)) {
      logger.warn(`Invalid bucket ID format: ${bucketId}`);
      return null;
    }

    // Don't allow updating _id, id, createdAt
    delete updates._id;
    delete updates.id;
    delete updates.createdAt;

    const updatedBucket = await SuggestedBucket.findByIdAndUpdate(
      bucketId,
      { ...updates, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).lean();

    if (!updatedBucket) {
      return null;
    }

    logger.info(`Updated suggested bucket: ${bucketId}`);

    // Convert MongoDB _id to id for backward compatibility
    return {
      ...updatedBucket,
      id: updatedBucket._id.toString(),
      _id: undefined
    };
  } catch (error) {
    logger.error('Error updating suggested bucket:', error.message);
    logger.error('Error stack:', error.stack);
    throw error;
  }
};

/**
 * Delete a suggested bucket
 * @param {string} bucketId - MongoDB ObjectId or string ID
 * @returns {Promise<boolean>} True if deleted, false if not found
 */
const deleteSuggestedBucket = async (bucketId) => {
  try {
    if (!isDatabaseConnected()) {
      throw new Error('Database not connected. Cannot delete suggested bucket.');
    }

    // Check if bucketId is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(bucketId)) {
      logger.warn(`Invalid bucket ID format: ${bucketId}`);
      return false;
    }

    const result = await SuggestedBucket.findByIdAndDelete(bucketId);

    if (!result) {
      return false;
    }

    logger.info(`Deleted suggested bucket: ${bucketId}`);
    return true;
  } catch (error) {
    logger.error('Error deleting suggested bucket:', error.message);
    logger.error('Error stack:', error.stack);
    throw error;
  }
};

// Legacy functions for backward compatibility (no longer used but kept for API compatibility)
const loadSuggestedBuckets = async () => {
  logger.warn('loadSuggestedBuckets() is deprecated, use getAllSuggestedBuckets() instead');
  return getAllSuggestedBuckets(false);
};

const saveSuggestedBuckets = async (buckets) => {
  logger.warn('saveSuggestedBuckets() is deprecated and no longer supported. Use individual create/update/delete functions instead.');
  throw new Error('saveSuggestedBuckets() is deprecated. Use addSuggestedBucket(), updateSuggestedBucket(), or deleteSuggestedBucket() instead.');
};

module.exports = {
  getAllSuggestedBuckets,
  getSuggestedBucketById,
  addSuggestedBucket,
  updateSuggestedBucket,
  deleteSuggestedBucket,
  loadSuggestedBuckets, // Deprecated but kept for backward compatibility
  saveSuggestedBuckets, // Deprecated but kept for backward compatibility
};
