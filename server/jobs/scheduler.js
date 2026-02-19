// server/jobs/scheduler.js
/**
 * Central In-Process Scheduler
 *
 * Strategy: Run ALL scheduled tasks inside the Node.js process using node-cron.
 * This eliminates 100% of cold-start failures caused by external cron services
 * hitting a sleeping Render free-tier instance.
 *
 * Additionally, a self-ping mechanism fires every 10 minutes to keep the
 * Render dyno warm so it never goes to sleep.
 *
 * Schedules (IST = UTC+5:30):
 *   - Bucket recalculation : daily at 2:00 AM IST
 *   - News refresh         : every 2 hours
 *   - News cleanup         : daily at 3:00 AM IST
 *   - Self-ping keep-alive : every 10 minutes
 */

const cron = require('node-cron');
const https = require('https');
const http = require('http');
const logger = require('../utils/logger');

const { runDailyRecalculation } = require('./dailyRecalculation.job');
const { runNewsRefresh, runNewsCleanup } = require('./newsRefresh.job');

// --------------------------------------------------------------------------
// Self-ping keep-alive — prevents Render free-tier cold starts
// --------------------------------------------------------------------------

/**
 * Ping our own /api/health endpoint so Render never spins the dyno down.
 * Works with both http and https depending on RENDER_EXTERNAL_URL or PORT.
 */
function selfPing() {
    try {
        // RENDER_EXTERNAL_URL is automatically set by Render (e.g. https://xxx.onrender.com)
        const renderUrl = process.env.RENDER_EXTERNAL_URL;

        if (renderUrl) {
            const url = `${renderUrl}/api/health`;
            const client = url.startsWith('https') ? https : http;

            const req = client.get(url, (res) => {
                logger.info(`[KeepAlive] Self-ping → ${url} | Status: ${res.statusCode}`);
                res.resume(); // Drain the response so the connection closes properly
            });

            req.on('error', (err) => {
                // Non-fatal — just log and move on
                logger.warn(`[KeepAlive] Self-ping failed: ${err.message}`);
            });

            req.setTimeout(10000, () => {
                req.destroy();
                logger.warn('[KeepAlive] Self-ping timed out');
            });
        } else {
            // Fallback: ping localhost when RENDER_EXTERNAL_URL is not set (local dev)
            const port = process.env.PORT || 5000;
            const req = http.get(`http://localhost:${port}/api/health`, (res) => {
                logger.info(`[KeepAlive] Self-ping → localhost:${port}/api/health | Status: ${res.statusCode}`);
                res.resume();
            });

            req.on('error', (err) => {
                logger.warn(`[KeepAlive] Self-ping failed (local): ${err.message}`);
            });

            req.setTimeout(10000, () => {
                req.destroy();
                logger.warn('[KeepAlive] Self-ping timed out (local)');
            });
        }
    } catch (err) {
        logger.warn(`[KeepAlive] Unexpected error during self-ping: ${err.message}`);
    }
}

// --------------------------------------------------------------------------
// Scheduler initialization
// --------------------------------------------------------------------------

function initScheduler() {
    logger.info('[Scheduler] Initializing in-process job scheduler...');

    const TZ = 'Asia/Kolkata';

    // ── 1. Bucket live-returns recalculation — daily at 2:00 AM IST ──────────
    cron.schedule('0 2 * * *', async () => {
        logger.info('[Scheduler] ⏰ Triggering bucket recalculation job...');
        try {
            await runDailyRecalculation();
        } catch (err) {
            logger.error('[Scheduler] Bucket recalculation job threw an unhandled error:', err);
        }
    }, { scheduled: true, timezone: TZ });

    logger.info('[Scheduler] ✅ Bucket recalculation scheduled — daily at 2:00 AM IST');

    // ── 2. News refresh — every 2 hours ──────────────────────────────────────
    cron.schedule('0 */2 * * *', async () => {
        logger.info('[Scheduler] ⏰ Triggering news refresh job...');
        try {
            await runNewsRefresh();
        } catch (err) {
            logger.error('[Scheduler] News refresh job threw an unhandled error:', err);
        }
    }, { scheduled: true, timezone: TZ });

    logger.info('[Scheduler] ✅ News refresh scheduled — every 2 hours');

    // ── 3. News cleanup — daily at 3:00 AM IST ───────────────────────────────
    cron.schedule('0 3 * * *', async () => {
        logger.info('[Scheduler] ⏰ Triggering news cleanup job...');
        try {
            await runNewsCleanup();
        } catch (err) {
            logger.error('[Scheduler] News cleanup job threw an unhandled error:', err);
        }
    }, { scheduled: true, timezone: TZ });

    logger.info('[Scheduler] ✅ News cleanup scheduled — daily at 3:00 AM IST');

    // ── 4. Keep-alive self-ping — every 30 seconds ────────────────────────────
    // Render free tier sleeps after ~50 seconds of inactivity.
    // node-cron minimum resolution is 1 minute, so we use setInterval instead.
    // 30 seconds gives a comfortable buffer before the 50-second sleep threshold.
    const PING_INTERVAL_MS = 30 * 1000; // 30 seconds
    setInterval(() => {
        selfPing();
    }, PING_INTERVAL_MS);

    logger.info('[Scheduler] ✅ Keep-alive self-ping scheduled — every 30 seconds (Render stays warm)');

    // ── 5. Initial runs on startup (staggered to avoid DB flood) ─────────────
    // Run news refresh 10 seconds after startup so the DB is fully ready
    setTimeout(async () => {
        logger.info('[Scheduler] 🚀 Running initial news fetch on startup...');
        try {
            await runNewsRefresh();
        } catch (err) {
            logger.error('[Scheduler] Initial news fetch failed:', err);
        }
    }, 10_000); // 10 seconds

    // Run bucket recalculation 2 minutes after startup (heavier operation)
    setTimeout(async () => {
        logger.info('[Scheduler] 🚀 Running initial bucket recalculation on startup...');
        try {
            await runDailyRecalculation();
        } catch (err) {
            logger.error('[Scheduler] Initial bucket recalculation failed:', err);
        }
    }, 2 * 60_000); // 2 minutes

    logger.info('[Scheduler] 🟢 All jobs registered. Server will stay warm via self-ping.');
}

module.exports = { initScheduler };
