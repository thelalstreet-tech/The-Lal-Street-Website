// server/models/Category.js
const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Category name is required'],
    unique: true, // Creates index automatically
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
    unique: true, // Creates index automatically
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

// Note: name and slug indexes are created automatically by unique: true
// No need for manual indexes

const Category = mongoose.model('Category', categorySchema);

module.exports = Category;

