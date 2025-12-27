// server/controllers/suggestedBuckets.controller.js
const {
  getAllSuggestedBuckets,
  getSuggestedBucketById,
  addSuggestedBucket,
  updateSuggestedBucket,
  deleteSuggestedBucket,
} = require('../services/suggestedBuckets.service');
const logger = require('../utils/logger');

/**
 * GET /api/suggested-buckets
 * Get all suggested buckets (optionally filter by active only)
 */
const handleGetAllBuckets = async (req, res) => {
  try {
    const { activeOnly } = req.query;
    const activeOnlyFilter = activeOnly === 'true' || activeOnly === true;
    
    const buckets = await getAllSuggestedBuckets(activeOnlyFilter);
    
    res.json({
      success: true,
      data: buckets,
      count: buckets.length,
    });
  } catch (error) {
    logger.error('Error getting suggested buckets:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error fetching suggested buckets',
      error: error.message,
    });
  }
};

/**
 * GET /api/suggested-buckets/:id
 * Get a single suggested bucket by ID
 */
const handleGetBucketById = async (req, res) => {
  try {
    const { id } = req.params;
    const bucket = await getSuggestedBucketById(id);
    
    if (!bucket) {
      return res.status(404).json({
        success: false,
        message: 'Suggested bucket not found',
      });
    }
    
    res.json({
      success: true,
      data: bucket,
    });
  } catch (error) {
    logger.error('Error getting suggested bucket:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error fetching suggested bucket',
      error: error.message,
    });
  }
};

/**
 * POST /api/suggested-buckets
 * Create a new suggested bucket (admin only)
 */
const handleCreateBucket = async (req, res) => {
  try {
    const bucketData = req.body;
    
    // Validate required fields
    if (!bucketData.name || !bucketData.funds || !Array.isArray(bucketData.funds)) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: name, funds (array)',
      });
    }
    
    const newBucket = await addSuggestedBucket(bucketData);
    
    res.status(201).json({
      success: true,
      data: newBucket,
      message: 'Suggested bucket created successfully',
    });
  } catch (error) {
    logger.error('Error creating suggested bucket:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error creating suggested bucket',
      error: error.message,
    });
  }
};

/**
 * PUT /api/suggested-buckets/:id
 * Update an existing suggested bucket (admin only)
 */
const handleUpdateBucket = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Don't allow updating ID, createdAt
    delete updates.id;
    delete updates.createdAt;
    
    const updatedBucket = await updateSuggestedBucket(id, updates);
    
    if (!updatedBucket) {
      return res.status(404).json({
        success: false,
        message: 'Suggested bucket not found',
      });
    }
    
    res.json({
      success: true,
      data: updatedBucket,
      message: 'Suggested bucket updated successfully',
    });
  } catch (error) {
    logger.error('Error updating suggested bucket:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error updating suggested bucket',
      error: error.message,
    });
  }
};

/**
 * DELETE /api/suggested-buckets/:id
 * Delete a suggested bucket (admin only)
 */
const handleDeleteBucket = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await deleteSuggestedBucket(id);
    
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Suggested bucket not found',
      });
    }
    
    res.json({
      success: true,
      message: 'Suggested bucket deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting suggested bucket:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error deleting suggested bucket',
      error: error.message,
    });
  }
};

module.exports = {
  handleGetAllBuckets,
  handleGetBucketById,
  handleCreateBucket,
  handleUpdateBucket,
  handleDeleteBucket,
};

