// server/models/BucketLiveReturns.js
const mongoose = require('mongoose');

const fundLiveReturnsSchema = new mongoose.Schema({
  fundId: { type: String, required: true },
  fundName: { type: String, required: true },
  currentNAV: { type: Number, default: null },
  cagr3Y: { type: Number, default: null },
  cagr5Y: { type: Number, default: null },
  lumpsumInvestment: { type: Number, required: true },
  lumpsumCurrentValue: { type: Number, default: null },
  lumpsumReturns: { type: Number, default: null },
  lumpsumReturnsPercent: { type: Number, default: null },
  sipTotalInvested: { type: Number, required: true },
  sipCurrentValue: { type: Number, default: null },
  sipXIRR: { type: Number, default: null },
  positivePercentageFromLaunch: { type: Number, default: null }
}, { _id: false });

const bucketLiveReturnsSchema = new mongoose.Schema({
  bucketId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SuggestedBucket',
    required: true,
    unique: true,
    index: true
  },
  bucketCagr3Y: { type: Number, default: null },
  bucketCagr5Y: { type: Number, default: null },
  lumpsumInvestment: { type: Number, required: true },
  lumpsumCurrentValue: { type: Number, default: null },
  lumpsumReturns: { type: Number, default: null },
  lumpsumReturnsPercent: { type: Number, default: null },
  sipTotalInvested: { type: Number, required: true },
  sipCurrentValue: { type: Number, default: null },
  sipXIRR: { type: Number, default: null },
  sipProfitPercentage: { type: Number, default: null },
  fundLiveReturns: {
    type: [fundLiveReturnsSchema],
    default: []
  },
  calculatedAt: {
    type: Date,
    default: Date.now,
    required: true,
    index: true
  },
  calculationDate: {
    type: String, // ISO date string (YYYY-MM-DD) for the date the calculation was based on
    required: true
  }
}, {
  timestamps: true
});

// Index for faster queries
bucketLiveReturnsSchema.index({ bucketId: 1, calculatedAt: -1 });
bucketLiveReturnsSchema.index({ calculationDate: -1 });

const BucketLiveReturns = mongoose.models.BucketLiveReturns || mongoose.model('BucketLiveReturns', bucketLiveReturnsSchema);

module.exports = BucketLiveReturns;

