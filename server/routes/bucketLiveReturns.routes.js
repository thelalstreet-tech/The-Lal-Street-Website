// server/routes/bucketLiveReturns.routes.js
const express = require('express');
const router = express.Router();
const {
  getBucketLiveReturns,
  recalculateBucketLiveReturns,
  recalculateAllBuckets
} = require('../services/bucketLiveReturns.service');
const { authenticateToken } = require('../middleware/auth.middleware');
const logger = require('../utils/logger');

/**
 * GET /api/bucket-live-returns/:bucketId
 * Get live returns for a specific bucket
 */
router.get('/:bucketId', async (req, res) => {
  try {
    const { bucketId } = req.params;
    const liveReturns = await getBucketLiveReturns(bucketId);
    
    res.json({
      success: true,
      data: liveReturns
    });
  } catch (error) {
    logger.error('Error getting bucket live returns:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get bucket live returns'
    });
  }
});

/**
 * POST /api/bucket-live-returns/:bucketId/recalculate
 * Manually trigger recalculation for a specific bucket
 * Requires authentication
 */
router.post('/:bucketId/recalculate', authenticateToken, async (req, res) => {
  try {
    const { bucketId } = req.params;
    const liveReturns = await recalculateBucketLiveReturns(bucketId);
    
    logger.info(`Live returns recalculated for bucket: ${bucketId}`);
    
    res.json({
      success: true,
      message: 'Live returns recalculated successfully',
      data: liveReturns
    });
  } catch (error) {
    logger.error('Error recalculating bucket live returns:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to recalculate bucket live returns'
    });
  }
});

/**
 * POST /api/bucket-live-returns/recalculate-all
 * Recalculate all active buckets
 * Requires authentication
 * Can be called by cron job (with secret key) or admin
 */
router.post('/recalculate-all', async (req, res) => {
  try {
    // Check for secret key (for cron jobs) or authentication (for admin)
    const cronSecret = req.headers['x-cron-secret'];
    const isCronRequest = cronSecret === process.env.CRON_SECRET;
    
    if (!isCronRequest) {
      // Require authentication for manual requests
      authenticateToken(req, res, async () => {
        try {
          const results = await recalculateAllBuckets();
          
          logger.info(`Recalculated all buckets: ${results.successful}/${results.total} successful`);
          
          res.json({
            success: true,
            message: 'All buckets recalculated',
            data: results
          });
        } catch (error) {
          logger.error('Error recalculating all buckets:', error);
          res.status(500).json({
            success: false,
            message: error.message || 'Failed to recalculate all buckets'
          });
        }
      });
      return;
    }

    // Cron job request
    const results = await recalculateAllBuckets();
    
    logger.info(`Cron job: Recalculated all buckets: ${results.successful}/${results.total} successful`);
    
    res.json({
      success: true,
      message: 'All buckets recalculated',
      data: results
    });
  } catch (error) {
    logger.error('Error recalculating all buckets:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to recalculate all buckets'
    });
  }
});

module.exports = router;

