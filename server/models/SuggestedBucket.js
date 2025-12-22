// server/models/SuggestedBucket.js
const mongoose = require('mongoose');

// Fund schema (embedded in bucket)
const fundSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  launchDate: {
    type: String,
    required: false
  },
  category: {
    type: String,
    required: false
  },
  weightage: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  }
}, { _id: false });

// Rolling returns schema
const rollingReturnsSchema = new mongoose.Schema({
  bucket: {
    mean: { type: Number, default: 0 },
    median: { type: Number, default: 0 },
    max: { type: Number, default: 0 },
    min: { type: Number, default: 0 },
    stdDev: { type: Number, default: 0 },
    positivePercentage: { type: Number, default: 0 }
  },
  funds: [{
    fundId: String,
    fundName: String,
    mean: Number,
    median: Number,
    max: Number,
    min: Number,
    stdDev: Number,
    positivePercentage: Number
  }]
}, { _id: false });

// Performance schema
const performanceSchema = new mongoose.Schema({
  rollingReturns: {
    type: rollingReturnsSchema,
    required: true
  },
  cagr: {
    type: Number,
    required: false
  },
  volatility: {
    type: Number,
    required: false
  },
  riskLevel: {
    type: String,
    enum: ['low', 'moderate', 'high'],
    required: true,
    default: 'moderate'
  },
  analysisStartDate: {
    type: String,
    required: true
  },
  analysisEndDate: {
    type: String,
    required: true
  },
  totalPeriods: {
    type: Number,
    required: true,
    default: 0
  }
}, { _id: false });

// Main suggested bucket schema
const suggestedBucketSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    enum: ['investment', 'retirement', 'both'],
    required: true,
    default: 'investment'
  },
  funds: {
    type: [fundSchema],
    required: true,
    validate: {
      validator: function(funds) {
        // Validate that total weightage equals 100
        const totalWeightage = funds.reduce((sum, fund) => sum + (fund.weightage || 0), 0);
        return Math.abs(totalWeightage - 100) < 0.01; // Allow small floating point differences
      },
      message: 'Total weightage of funds must equal 100'
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastCalculationDate: {
    type: String,
    required: false
  },
  performance: {
    type: performanceSchema,
    required: false
  },
  tags: {
    type: [String],
    default: []
  },
  riskLevel: {
    type: String,
    enum: ['low', 'moderate', 'high'],
    required: true,
    default: 'moderate'
  },
  minInvestment: {
    type: Number,
    required: false
  },
  targetAudience: {
    type: String,
    required: false
  }
}, {
  timestamps: true, // Automatically adds createdAt and updatedAt
  toJSON: {
    transform: function(doc, ret) {
      // Convert _id to id for consistency with frontend
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Indexes for better query performance
suggestedBucketSchema.index({ isActive: 1 });
suggestedBucketSchema.index({ category: 1 });
suggestedBucketSchema.index({ createdAt: -1 });

const SuggestedBucket = mongoose.model('SuggestedBucket', suggestedBucketSchema);

module.exports = SuggestedBucket;

