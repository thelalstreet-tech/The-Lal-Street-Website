// server/jobs/dailyRecalculation.job.js
/**
 * Daily Recalculation Job
 * 
 * This job runs daily to recalculate live returns for all active buckets.
 * It can be triggered by:
 * 1. Cron job (external service like EasyCron, cron-job.org)
 * 2. Node-cron (if running on a persistent server)
 * 3. Manual API call (for testing)
 * 
 * To set up with external cron service:
 * - URL: https://your-domain.com/api/bucket-live-returns/recalculate-all
 * - Method: POST
 * - Headers: x-cron-secret: YOUR_CRON_SECRET (from .env)
 * - Schedule: Daily at 2:00 AM (or preferred time)
 */

const { recalculateAllBuckets } = require('../services/bucketLiveReturns.service');
const logger = require('../utils/logger');

/**
 * Run the daily recalculation job
 */
async function runDailyRecalculation() {
  const startTime = Date.now();
  logger.info('[Daily Recalculation] Starting daily recalculation job...');

  try {
    const results = await recalculateAllBuckets();
    
    const duration = Date.now() - startTime;
    logger.info(`[Daily Recalculation] Completed in ${duration}ms`);
    logger.info(`[Daily Recalculation] Results: ${results.successful}/${results.total} successful, ${results.failed} failed`);

    if (results.errors.length > 0) {
      logger.warn('[Daily Recalculation] Errors:', results.errors);
    }

    return {
      success: true,
      duration,
      results
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('[Daily Recalculation] Job failed:', error);
    logger.error(`[Daily Recalculation] Failed after ${duration}ms`);
    
    return {
      success: false,
      duration,
      error: error.message
    };
  }
}

// If running with node-cron (for persistent servers)
if (process.env.USE_NODE_CRON === 'true') {
  const cron = require('node-cron');
  
  // Run daily at 2:00 AM
  cron.schedule('0 2 * * *', async () => {
    logger.info('[Cron] Daily recalculation job triggered');
    await runDailyRecalculation();
  }, {
    scheduled: true,
    timezone: "Asia/Kolkata" // Adjust to your timezone
  });
  
  logger.info('[Cron] Daily recalculation job scheduled (runs at 2:00 AM daily)');
}

module.exports = {
  runDailyRecalculation
};

