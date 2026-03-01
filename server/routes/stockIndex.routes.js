// server/routes/stockIndex.routes.js
const express = require('express');
const router = express.Router();
const { handleGetAllIndices, handleGetIndexStocks } = require('../controllers/stockIndex.controller');

// GET /api/stock-indices - Get all indices list
router.get('/', handleGetAllIndices);

// GET /api/stock-indices/:slug/stocks - Get stocks for a specific index
router.get('/:slug/stocks', handleGetIndexStocks);

module.exports = router;
