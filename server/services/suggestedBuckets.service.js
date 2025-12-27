// server/services/suggestedBuckets.service.js
const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

// File path for storing suggested buckets
// On Render with rootDir='server', process.cwd() is the server directory
// So data file will be stored in server/data/suggestedBuckets.json
const BUCKETS_FILE_PATH = path.join(process.cwd(), 'data', 'suggestedBuckets.json');

// Ensure data directory exists
const DATA_DIR = path.dirname(BUCKETS_FILE_PATH);
const ensureDataDir = async () => {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (error) {
    // Directory might already exist, that's fine
    if (error.code !== 'EEXIST') {
      logger.error('Error creating data directory:', error.message);
    }
  }
};

/**
 * Load suggested buckets from file
 * @returns {Promise<Array>} Array of suggested buckets
 */
const loadSuggestedBuckets = async () => {
  try {
    await ensureDataDir();
    const data = await fs.readFile(BUCKETS_FILE_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      // File doesn't exist, return empty array
      logger.info('Suggested buckets file not found, returning empty array');
      return [];
    }
    logger.error('Error loading suggested buckets:', error.message);
    logger.error('Error stack:', error.stack);
    return [];
  }
};

/**
 * Save suggested buckets to file
 * @param {Array} buckets - Array of suggested buckets to save
 * @returns {Promise<void>}
 */
const saveSuggestedBuckets = async (buckets) => {
  try {
    await ensureDataDir();
    await fs.writeFile(
      BUCKETS_FILE_PATH,
      JSON.stringify(buckets, null, 2),
      'utf8'
    );
    logger.info(`Saved ${buckets.length} suggested buckets to file`);
  } catch (error) {
    logger.error('Error saving suggested buckets:', error.message);
    logger.error('Error stack:', error.stack);
    logger.error('Attempted path:', BUCKETS_FILE_PATH);
    throw new Error(`Failed to save suggested buckets: ${error.message}`);
  }
};

/**
 * Get all suggested buckets
 * @param {boolean} activeOnly - If true, return only active buckets
 * @returns {Promise<Array>}
 */
const getAllSuggestedBuckets = async (activeOnly = false) => {
  const buckets = await loadSuggestedBuckets();
  if (activeOnly) {
    return buckets.filter(b => b.isActive === true);
  }
  return buckets;
};

/**
 * Get a single suggested bucket by ID
 * @param {string} bucketId
 * @returns {Promise<Object|null>}
 */
const getSuggestedBucketById = async (bucketId) => {
  const buckets = await loadSuggestedBuckets();
  return buckets.find(b => b.id === bucketId) || null;
};

/**
 * Add a new suggested bucket
 * @param {Object} bucketData - Bucket data (without id, createdAt, updatedAt)
 * @returns {Promise<Object>} Created bucket with generated fields
 */
const addSuggestedBucket = async (bucketData) => {
  const buckets = await loadSuggestedBuckets();
  
  const newBucket = {
    ...bucketData,
    id: bucketData.id || `bucket-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    createdAt: bucketData.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  buckets.push(newBucket);
  await saveSuggestedBuckets(buckets);
  
  logger.info(`Added new suggested bucket: ${newBucket.id}`);
  return newBucket;
};

/**
 * Update an existing suggested bucket
 * @param {string} bucketId
 * @param {Object} updates - Partial bucket data to update
 * @returns {Promise<Object|null>} Updated bucket or null if not found
 */
const updateSuggestedBucket = async (bucketId, updates) => {
  const buckets = await loadSuggestedBuckets();
  const index = buckets.findIndex(b => b.id === bucketId);
  
  if (index === -1) {
    return null;
  }
  
  buckets[index] = {
    ...buckets[index],
    ...updates,
    id: bucketId, // Ensure ID doesn't change
    updatedAt: new Date().toISOString(),
  };
  
  await saveSuggestedBuckets(buckets);
  
  logger.info(`Updated suggested bucket: ${bucketId}`);
  return buckets[index];
};

/**
 * Delete a suggested bucket
 * @param {string} bucketId
 * @returns {Promise<boolean>} True if deleted, false if not found
 */
const deleteSuggestedBucket = async (bucketId) => {
  const buckets = await loadSuggestedBuckets();
  const initialLength = buckets.length;
  const filtered = buckets.filter(b => b.id !== bucketId);
  
  if (filtered.length === initialLength) {
    return false; // Not found
  }
  
  await saveSuggestedBuckets(filtered);
  
  logger.info(`Deleted suggested bucket: ${bucketId}`);
  return true;
};

module.exports = {
  getAllSuggestedBuckets,
  getSuggestedBucketById,
  addSuggestedBucket,
  updateSuggestedBucket,
  deleteSuggestedBucket,
  loadSuggestedBuckets,
  saveSuggestedBuckets,
};

