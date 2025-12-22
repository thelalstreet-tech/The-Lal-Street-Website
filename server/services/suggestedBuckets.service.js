// server/services/suggestedBuckets.service.js
const SuggestedBucket = require('../models/SuggestedBucket');
const mongoose = require('mongoose');
const logger = require('../utils/logger');

// Helper to check if database is connected
const isDatabaseConnected = () => {
  return mongoose.connection.readyState === 1; // 1 = connected
};

/**
 * Get all suggested buckets
 * @param {boolean} activeOnly - If true, return only active buckets
 * @returns {Promise<Array>}
 */
const getAllSuggestedBuckets = async (activeOnly = false) => {
  if (!isDatabaseConnected()) {
    logger.warn('Database not connected, returning empty array for suggested buckets');
    return [];
  }

  try {
    const query = activeOnly ? { isActive: true } : {};
    const buckets = await SuggestedBucket.find(query).sort({ createdAt: -1 });
    return buckets.map(bucket => bucket.toJSON());
  } catch (error) {
    logger.error('Error fetching suggested buckets from database:', error.message);
    throw error;
  }
};

/**
 * Get a single suggested bucket by ID
 * @param {string} bucketId
 * @returns {Promise<Object|null>}
 */
const getSuggestedBucketById = async (bucketId) => {
  if (!isDatabaseConnected()) {
    logger.warn('Database not connected, cannot fetch bucket by ID');
    return null;
  }

  try {
    // Check if bucketId is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(bucketId)) {
      return null;
    }
    
    const bucket = await SuggestedBucket.findById(bucketId);
    return bucket ? bucket.toJSON() : null;
  } catch (error) {
    logger.error('Error fetching suggested bucket by ID:', error.message);
    throw error;
  }
};

/**
 * Add a new suggested bucket
 * @param {Object} bucketData - Bucket data (without id, createdAt, updatedAt)
 * @returns {Promise<Object>} Created bucket with generated fields
 */
const addSuggestedBucket = async (bucketData) => {
  if (!isDatabaseConnected()) {
    throw new Error('Database not connected, cannot create bucket');
  }

  try {
    // Remove id if present (MongoDB will generate _id)
    const { id, ...bucketDataWithoutId } = bucketData;
    
    const newBucket = new SuggestedBucket(bucketDataWithoutId);
    await newBucket.save();
    
    logger.info(`Added new suggested bucket: ${newBucket._id}`);
    return newBucket.toJSON();
  } catch (error) {
    logger.error('Error creating suggested bucket:', error.message);
    throw error;
  }
};

/**
 * Update an existing suggested bucket
 * @param {string} bucketId
 * @param {Object} updates - Partial bucket data to update
 * @returns {Promise<Object|null>} Updated bucket or null if not found
 */
const updateSuggestedBucket = async (bucketId, updates) => {
  if (!isDatabaseConnected()) {
    throw new Error('Database not connected, cannot update bucket');
  }

  try {
    // Don't allow updating _id, createdAt
    delete updates._id;
    delete updates.id;
    delete updates.createdAt;
    // updatedAt is handled automatically by timestamps: true
    
    const bucket = await SuggestedBucket.findByIdAndUpdate(
      bucketId,
      updates,
      { new: true, runValidators: true }
    );
    
    if (!bucket) {
      return null;
    }
    
    logger.info(`Updated suggested bucket: ${bucketId}`);
    return bucket.toJSON();
  } catch (error) {
    logger.error('Error updating suggested bucket:', error.message);
    throw error;
  }
};

/**
 * Delete a suggested bucket
 * @param {string} bucketId
 * @returns {Promise<boolean>} True if deleted, false if not found
 */
const deleteSuggestedBucket = async (bucketId) => {
  if (!isDatabaseConnected()) {
    throw new Error('Database not connected, cannot delete bucket');
  }

  try {
    const result = await SuggestedBucket.findByIdAndDelete(bucketId);
    
    if (!result) {
      return false; // Not found
    }
    
    logger.info(`Deleted suggested bucket: ${bucketId}`);
    return true;
  } catch (error) {
    logger.error('Error deleting suggested bucket:', error.message);
    throw error;
  }
};

module.exports = {
  getAllSuggestedBuckets,
  getSuggestedBucketById,
  addSuggestedBucket,
  updateSuggestedBucket,
  deleteSuggestedBucket,
};

