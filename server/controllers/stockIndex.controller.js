// server/controllers/stockIndex.controller.js
const { getAllIndices, getIndexBySlug } = require('../services/stockIndex.service');
const logger = require('../utils/logger');

/**
 * Get all available indices
 */
const handleGetAllIndices = async (req, res) => {
    try {
        const indices = await getAllIndices();
        res.json(indices);
    } catch (error) {
        logger.error('Error in handleGetAllIndices:', error.message);
        res.status(500).json({ message: 'Error fetching stock indices.' });
    }
};

/**
 * Get index constituents by slug
 */
const handleGetIndexStocks = async (req, res) => {
    try {
        const { slug } = req.params;
        const { search } = req.query;

        if (!slug) {
            return res.status(400).json({ message: 'Index slug is required.' });
        }

        const index = await getIndexBySlug(slug, search);

        if (!index) {
            return res.status(404).json({ message: `Index '${slug}' not found.` });
        }

        res.json(index);
    } catch (error) {
        logger.error(`Error in handleGetIndexStocks for ${req.params.slug}:`, error.message);
        res.status(500).json({ message: `Error fetching stocks for index ${req.params.slug}.` });
    }
};

module.exports = {
    handleGetAllIndices,
    handleGetIndexStocks
};
