// server/models/StockIndex.js
const mongoose = require('mongoose');

const constituentSchema = new mongoose.Schema({
    symbol: { type: String, required: true },
    companyName: { type: String, required: true },
    industry: { type: String, default: '' },
    isin: { type: String, default: '' },
    series: { type: String, default: 'EQ' },
    weightage: { type: Number, default: 0 }
}, { _id: false });

const stockIndexSchema = new mongoose.Schema({
    slug: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    name: {
        type: String,
        required: true
    },
    exchange: {
        type: String,
        enum: ['NSE', 'BSE'],
        default: 'NSE'
    },
    constituents: [constituentSchema],
    lastUpdated: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

const StockIndex = mongoose.models.StockIndex || mongoose.model('StockIndex', stockIndexSchema);

module.exports = StockIndex;
