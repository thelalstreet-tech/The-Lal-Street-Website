// server/models/Tag.js
const mongoose = require('mongoose');

const tagSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Tag name is required'],
    unique: true,
    trim: true,
    lowercase: true,
    maxlength: [30, 'Tag name cannot exceed 30 characters'],
  },
  blogCount: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

// Clean name before saving (remove brackets, quotes, backslashes)
tagSchema.pre('save', function(next) {
  if (this.isModified('name') && this.name) {
    // Clean the name
    this.name = this.name.replace(/[\[\]"\\]/g, '').trim().toLowerCase();
  }
  next();
});

// Index for faster lookups
tagSchema.index({ name: 1 });

const Tag = mongoose.model('Tag', tagSchema);

module.exports = Tag;

