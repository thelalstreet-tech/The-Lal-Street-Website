// server/jobs/newsRefresh.job.js
/**
 * News Refresh Job
 * 
 * This job runs every 2 hours to fetch latest news from RSS feeds.
 * It can be triggered by:
 * 1. Cron job (external service like EasyCron, cron-job.org)
 * 2. Node-cron (if running on a persistent server)
 * 3. Manual API call (for testing)
 * 
 * To set up with external cron service:
 * - URL: https://your-domain.com/api/news/refresh
 * - Method: POST
 * - Headers: x-cron-secret: YOUR_CRON_SECRET (from .env)
 * - Schedule: Every 2 hours
 */

const newsService = require('../services/news.service');
const logger = require('../utils/logger');

/**
 * Run the news refresh job
 */
async function runNewsRefresh() {
    const startTime = Date.now();
    logger.info('[News Refresh] Starting news refresh job...');

    try {
        const result = await newsService.fetchAllNews();

        const duration = Date.now() - startTime;
        logger.info(`[News Refresh] Completed in ${duration}ms`);
        logger.info(`[News Refresh] Fetched: ${result.totalFetched}, Saved: ${result.totalSaved}, Errors: ${result.errors}`);

        return {
            success: true,
            duration,
            ...result
        };
    } catch (error) {
        const duration = Date.now() - startTime;
        logger.error('[News Refresh] Job failed:', error);

        return {
            success: false,
            duration,
            error: error.message
        };
    }
}

/**
 * Run the news cleanup job (remove old articles)
 */
async function runNewsCleanup() {
    logger.info('[News Cleanup] Starting cleanup of old news...');

    try {
        const deleted = await newsService.cleanupOldNews();
        logger.info(`[News Cleanup] Deleted ${deleted} old articles`);
        return { success: true, deleted };
    } catch (error) {
        logger.error('[News Cleanup] Cleanup failed:', error);
        return { success: false, error: error.message };
    }
}

// If running with node-cron (for persistent servers)
if (process.env.USE_NODE_CRON === 'true') {
    const cron = require('node-cron');

    // Run every 2 hours
    cron.schedule('0 */2 * * *', async () => {
        logger.info('[Cron] News refresh job triggered');
        await runNewsRefresh();
    }, {
        scheduled: true,
        timezone: "Asia/Kolkata"
    });

    // Run cleanup once daily at 3:00 AM
    cron.schedule('0 3 * * *', async () => {
        logger.info('[Cron] News cleanup job triggered');
        await runNewsCleanup();
    }, {
        scheduled: true,
        timezone: "Asia/Kolkata"
    });

    logger.info('[Cron] News refresh job scheduled (runs every 2 hours)');
    logger.info('[Cron] News cleanup job scheduled (runs at 3:00 AM daily)');

    // Initial fetch on startup (after a short delay)
    setTimeout(async () => {
        logger.info('[Startup] Running initial news fetch...');
        await runNewsRefresh();
    }, 5000); // Wait 5 seconds after startup
}

module.exports = {
    runNewsRefresh,
    runNewsCleanup
};
