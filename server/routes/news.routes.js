// server/routes/news.routes.js
const express = require('express');
const router = express.Router();
const newsService = require('../services/news.service');
const logger = require('../utils/logger');

// Get news with filters
router.get('/', async (req, res) => {
    try {
        const {
            page = 1,
            limit = 30,
            source,
            category,
            search
        } = req.query;

        const result = await newsService.getNews({
            page: parseInt(page),
            limit: Math.min(parseInt(limit), 100), // Max 100 items
            source,
            category,
            search
        });

        res.json({
            success: true,
            ...result
        });
    } catch (error) {
        logger.error('Error fetching news:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch news',
            error: error.message
        });
    }
});

// Get available sources
router.get('/sources', async (req, res) => {
    try {
        const sources = await newsService.getSources();
        res.json({
            success: true,
            data: sources
        });
    } catch (error) {
        logger.error('Error fetching sources:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch sources'
        });
    }
});

// Get available categories
router.get('/categories', async (req, res) => {
    try {
        const categories = await newsService.getCategories();
        res.json({
            success: true,
            data: categories
        });
    } catch (error) {
        logger.error('Error fetching categories:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch categories'
        });
    }
});

// Manually trigger news fetch (protected route)
router.post('/refresh', async (req, res) => {
    try {
        // Verify cron secret for manual triggers
        const cronSecret = req.headers['x-cron-secret'];
        if (cronSecret !== process.env.CRON_SECRET) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized'
            });
        }

        const result = await newsService.fetchAllNews();
        res.json({
            success: true,
            message: 'News refreshed successfully',
            ...result
        });
    } catch (error) {
        logger.error('Error refreshing news:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to refresh news',
            error: error.message
        });
    }
});

// Cleanup old news (protected route)
router.post('/cleanup', async (req, res) => {
    try {
        const cronSecret = req.headers['x-cron-secret'];
        if (cronSecret !== process.env.CRON_SECRET) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized'
            });
        }

        const deleted = await newsService.cleanupOldNews();
        res.json({
            success: true,
            message: `Cleaned up ${deleted} old news articles`
        });
    } catch (error) {
        logger.error('Error cleaning up news:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to cleanup news'
        });
    }
});

module.exports = router;
