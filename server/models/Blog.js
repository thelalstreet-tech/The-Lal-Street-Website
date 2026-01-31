// server/models/Blog.js
const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Blog title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters'],
  },
  content: {
    type: String,
    required: [true, 'Blog content is required'],
  },
  imageUrl: {
    type: String,
    required: [true, 'Blog image is required'],
  },
  imagePublicId: {
    type: String,
    // Optional: store Cloudinary public ID for deletion
  },
  categories: [{
    type: String,
    trim: true,
    lowercase: true,
  }],
  tags: [{
    type: String,
    trim: true,
    lowercase: true,
  }],
  exclusive: {
    type: Boolean,
    default: false,
  },
  author: {
    type: String,
    default: 'The Lal Street',
    trim: true,
  },
  views: {
    type: Number,
    default: 0,
  },
  isPublished: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true, // Adds createdAt and updatedAt
});

// Indexes for better query performance
blogSchema.index({ createdAt: -1 }); // For sorting by latest
blogSchema.index({ categories: 1 }); // For filtering by category
blogSchema.index({ tags: 1 }); // For filtering by tags
blogSchema.index({ exclusive: 1 }); // For filtering exclusive blogs
blogSchema.index({ isPublished: 1 }); // For filtering published blogs
blogSchema.index({ title: 'text', content: 'text' }); // For text search

// Virtual for formatted date
blogSchema.virtual('formattedDate').get(function() {
  return this.createdAt.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
});

// Ensure virtuals are included in JSON
blogSchema.set('toJSON', { virtuals: true });
blogSchema.set('toObject', { virtuals: true });

const Blog = mongoose.model('Blog', blogSchema);

module.exports = Blog;







