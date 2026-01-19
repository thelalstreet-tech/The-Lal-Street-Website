// server/models/SuggestedBucket.js
const mongoose = require('mongoose');

const fundSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  launchDate: { type: String, required: true },
  category: { type: String, required: true },
  weightage: { type: Number, required: true, min: 0, max: 100 }
}, { _id: false });

const rollingReturnsSchema = new mongoose.Schema({
  mean: { type: Number, required: true },
  median: { type: Number, required: true },
  max: { type: Number, required: true },
  min: { type: Number, required: true },
  stdDev: { type: Number, required: true },
  positivePercentage: { type: Number, required: true }
}, { _id: false });

const fundPerformanceSchema = new mongoose.Schema({
  fundId: { type: String, required: true },
  fundName: { type: String, required: true },
  mean: { type: Number, required: true },
  median: { type: Number, required: true },
  max: { type: Number, required: true },
  min: { type: Number, required: true },
  stdDev: { type: Number, required: true },
  positivePercentage: { type: Number, required: true }
}, { _id: false });

const performanceSchema = new mongoose.Schema({
  rollingReturns: {
    bucket: { type: rollingReturnsSchema, required: true },
    funds: { type: [fundPerformanceSchema], default: [] }
  },
  riskLevel: { 
    type: String, 
    required: true, 
    enum: ['low', 'moderate', 'high'] 
  },
  analysisStartDate: { type: String, required: true },
  analysisEndDate: { type: String, required: true },
  totalPeriods: { type: Number, required: true }
}, { _id: false });

const suggestedBucketSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: '',
    trim: true
  },
  category: {
    type: String,
    required: true,
    enum: ['investment', 'retirement', 'both'],
    default: 'both'
  },
  funds: {
    type: [fundSchema],
    required: true,
    validate: {
      validator: function(funds) {
        // Ensure total weightage equals 100
        const total = funds.reduce((sum, fund) => sum + (fund.weightage || 0), 0);
        return Math.abs(total - 100) < 0.01; // Allow small floating point differences
      },
      message: 'Total fund weightage must equal 100%'
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  performance: {
    type: performanceSchema,
    required: true
  },
  riskLevel: {
    type: String,
    required: true,
    enum: ['low', 'moderate', 'high']
  },
  lastCalculationDate: {
    type: Date,
    default: null
  }
}, {
  timestamps: true // Adds createdAt and updatedAt automatically
});

// Index for faster queries
suggestedBucketSchema.index({ isActive: 1 });
suggestedBucketSchema.index({ category: 1 });
suggestedBucketSchema.index({ createdAt: -1 });

const SuggestedBucket = mongoose.models.SuggestedBucket || mongoose.model('SuggestedBucket', suggestedBucketSchema);

module.exports = SuggestedBucket;






