// server/services/stockIndex.service.js
const StockIndex = require('../models/StockIndex');
const logger = require('../utils/logger');

/**
 * Get all available stock indices (metadata only, no constituents)
 */
const getAllIndices = async () => {
    try {
        const indices = await StockIndex.find({}, {
            slug: 1,
            name: 1,
            exchange: 1,
            lastUpdated: 1,
            constituents: 1 // Fetch constituents to count them manually if needed, or better use $ifNull
        }).sort({ name: 1 }).lean();

        // Safely calculate constituentCount
        return indices.map(index => ({
            ...index,
            constituentCount: Array.isArray(index.constituents) ? index.constituents.length : 0,
            constituents: undefined // Don't return the full array in the list view
        }));
    } catch (error) {
        logger.error('Error in getAllIndices service:', error.message);
        throw error;
    }
};

/**
 * Get a specific index and its constituents by slug
 * @param {string} slug - The index slug (e.g., 'nifty-50')
 * @param {string} search - Optional search query to filter constituents
 */
const getIndexBySlug = async (slug, search = '') => {
    try {
        const query = { slug };
        const index = await StockIndex.findOne(query);

        if (!index) return null;

        // If there's a search query, filter the constituents array manually
        // (In the future, with a separate Stock model, this would be a MongoDB query)
        if (search) {
            const lowerSearch = search.toLowerCase();
            index.constituents = index.constituents.filter(c =>
                c.symbol.toLowerCase().includes(lowerSearch) ||
                c.companyName.toLowerCase().includes(lowerSearch)
            );
        }

        return index;
    } catch (error) {
        logger.error(`Error in getIndexBySlug service for ${slug}:`, error.message);
        throw error;
    }
};

module.exports = {
    getAllIndices,
    getIndexBySlug
};
