// server/models/Category.js
const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Category name is required'],
    unique: true,
    trim: true,
    lowercase: true,
    maxlength: [50, 'Category name cannot exceed 50 characters'],
  },
  description: {
    type: String,
    trim: true,
    maxlength: [200, 'Description cannot exceed 200 characters'],
  },
  slug: {
    type: String,
    unique: true,
    sparse: true, // Allows multiple null values
    trim: true,
    lowercase: true,
  },
  blogCount: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

// Generate slug from name
const generateSlug = (name) => {
  if (!name) return null;
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
};

// Clean name before saving (remove brackets, quotes, backslashes)
categorySchema.pre('save', function(next) {
  if (this.isModified('name') && this.name) {
    // Clean the name
    this.name = this.name.replace(/[\[\]"\\]/g, '').trim().toLowerCase();
    // Generate slug if not set
    if (!this.slug) {
      this.slug = generateSlug(this.name);
    }
  }
  next();
});

// Index for faster lookups
categorySchema.index({ name: 1 });
categorySchema.index({ slug: 1 }, { sparse: true }); // Sparse index allows multiple nulls

const Category = mongoose.model('Category', categorySchema);

module.exports = Category;

