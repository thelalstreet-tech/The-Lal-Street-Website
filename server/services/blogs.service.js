// server/services/blogs.service.js
const mongoose = require('mongoose');
const Blog = require('../models/Blog');
const Category = require('../models/Category');
const Tag = require('../models/Tag');
const logger = require('../utils/logger');

/**
 * Check if database is connected
 * @returns {boolean}
 */
const isDatabaseConnected = () => {
  return mongoose.connection.readyState === 1; // 1 = connected
};

/**
 * Get all blogs with filters and pagination
 * @param {Object} filters - Filter options
 * @param {Object} options - Query options (sort, limit, skip)
 * @returns {Promise<Object>} Blogs and total count
 */
const getAllBlogs = async (filters = {}, options = {}) => {
  try {
    if (!isDatabaseConnected()) {
      logger.warn('Database not connected, returning empty array for blogs');
      return { blogs: [], total: 0 };
    }

    const {
      category,
      tags,
      exclusive,
      search,
      isPublished = true,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      limit = 50,
      skip = 0,
    } = filters;

    // Build query
    const query = {};

    // Published filter
    if (isPublished !== undefined) {
      query.isPublished = isPublished;
    }

    // Category filter
    if (category) {
      query.categories = { $in: [category.toLowerCase()] };
    }

    // Tags filter (any of the tags)
    if (tags && Array.isArray(tags) && tags.length > 0) {
      query.tags = { $in: tags.map(tag => tag.toLowerCase()) };
    }

    // Exclusive filter
    if (exclusive !== undefined) {
      query.exclusive = exclusive;
    }

    // Text search
    if (search) {
      query.$text = { $search: search };
    }

    // Sort options
    const sort = {};
    if (sortBy === 'createdAt') {
      sort.createdAt = sortOrder === 'asc' ? 1 : -1;
    } else if (sortBy === 'views') {
      sort.views = sortOrder === 'asc' ? 1 : -1;
    } else {
      sort.createdAt = -1; // Default to latest
    }

    // Execute query
    const [blogs, total] = await Promise.all([
      Blog.find(query)
        .sort(sort)
        .limit(parseInt(limit))
        .skip(parseInt(skip))
        .lean(),
      Blog.countDocuments(query),
    ]);

    // Convert MongoDB _id to id and ensure categories/tags are arrays
    const formattedBlogs = blogs.map(blog => {
      // Ensure categories and tags are arrays (handle stringified arrays)
      let categories = blog.categories || [];
      let tags = blog.tags || [];
      
      // If they're strings, try to parse them
      if (typeof categories === 'string') {
        try {
          categories = JSON.parse(categories);
        } catch {
          // If not JSON, treat as comma-separated
          categories = categories.split(',').map(c => c.trim().replace(/[\[\]"]/g, '')).filter(c => c);
        }
      }
      if (typeof tags === 'string') {
        try {
          tags = JSON.parse(tags);
        } catch {
          tags = tags.split(',').map(t => t.trim().replace(/[\[\]"]/g, '')).filter(t => t);
        }
      }
      
      // Clean up any remaining brackets, quotes, or backslashes
      categories = Array.isArray(categories) 
        ? categories.map(c => typeof c === 'string' ? c.replace(/[\[\]"\\]/g, '').trim() : c).filter(c => c)
        : [];
      tags = Array.isArray(tags)
        ? tags.map(t => typeof t === 'string' ? t.replace(/[\[\]"\\]/g, '').trim() : t).filter(t => t)
        : [];
      
      return {
        ...blog,
        id: blog._id.toString(),
        _id: undefined,
        categories,
        tags,
      };
    });

    return {
      blogs: formattedBlogs,
      total,
      limit: parseInt(limit),
      skip: parseInt(skip),
    };
  } catch (error) {
    logger.error('Error getting all blogs:', error.message);
    logger.error('Error stack:', error.stack);
    return { blogs: [], total: 0 };
  }
};

/**
 * Get a single blog by ID
 * @param {string} id - Blog ID
 * @returns {Promise<Object|null>} Blog object or null
 */
const getBlogById = async (id) => {
  try {
    if (!isDatabaseConnected()) {
      logger.warn('Database not connected, cannot get blog');
      return null;
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }

    const blog = await Blog.findById(id).lean();

    if (!blog) {
      return null;
    }

    // Increment views
    await Blog.findByIdAndUpdate(id, { $inc: { views: 1 } });

    // Ensure categories and tags are arrays
    let categories = blog.categories || [];
    let tags = blog.tags || [];
    
    if (typeof categories === 'string') {
      try {
        categories = JSON.parse(categories);
      } catch {
        categories = categories.split(',').map(c => c.trim().replace(/[\[\]"]/g, '')).filter(c => c);
      }
    }
    if (typeof tags === 'string') {
      try {
        tags = JSON.parse(tags);
      } catch {
        tags = tags.split(',').map(t => t.trim().replace(/[\[\]"]/g, '')).filter(t => t);
      }
    }
    
    // Clean up any remaining brackets, quotes, or backslashes
    categories = Array.isArray(categories) 
      ? categories.map(c => typeof c === 'string' ? c.replace(/[\[\]"\\]/g, '').trim() : c).filter(c => c)
      : [];
    tags = Array.isArray(tags)
      ? tags.map(t => typeof t === 'string' ? t.replace(/[\[\]"\\]/g, '').trim() : t).filter(t => t)
      : [];

    return {
      ...blog,
      id: blog._id.toString(),
      _id: undefined,
      categories,
      tags,
    };
  } catch (error) {
    logger.error('Error getting blog by ID:', error.message);
    return null;
  }
};

/**
 * Create a new blog
 * @param {Object} blogData - Blog data
 * @returns {Promise<Object>} Created blog
 */
const createBlog = async (blogData) => {
  try {
    if (!isDatabaseConnected()) {
      throw new Error('Database not connected');
    }

    const {
      title,
      content,
      imageUrl,
      imagePublicId,
      categories = [],
      tags = [],
      exclusive = false,
      author = 'The Lal Street',
      isPublished = true,
    } = blogData;

    // Validate required fields
    if (!title || !content || !imageUrl) {
      throw new Error('Missing required fields: title, content, imageUrl');
    }

    // Normalize categories and tags (ensure they're arrays, clean, lowercase, trim)
    // Controller should have already parsed them, but ensure they're clean arrays
    const ensureArray = (value) => {
      if (!value) return [];
      if (Array.isArray(value)) return value;
      if (typeof value === 'string') {
        try {
          const parsed = JSON.parse(value);
          return Array.isArray(parsed) ? parsed : [parsed];
        } catch {
          return value.replace(/^\[|\]$/g, '').replace(/"/g, '').split(',').map(s => s.trim()).filter(s => s);
        }
      }
      return [];
    };

    const categoriesArray = ensureArray(categories);
    const tagsArray = ensureArray(tags);

    // Normalize: clean, lowercase, trim, remove brackets/quotes/backslashes
    const normalizedCategories = categoriesArray
      .map(cat => {
        const str = typeof cat === 'string' ? cat : String(cat);
        return str.replace(/[\[\]"\\]/g, '').trim().toLowerCase();
      })
      .filter(cat => cat.length > 0);
    
    const normalizedTags = tagsArray
      .map(tag => {
        const str = typeof tag === 'string' ? tag : String(tag);
        return str.replace(/[\[\]"\\]/g, '').trim().toLowerCase();
      })
      .filter(tag => tag.length > 0);

    // Create blog
    const blog = new Blog({
      title,
      content,
      imageUrl,
      imagePublicId,
      categories: normalizedCategories,
      tags: normalizedTags,
      exclusive,
      author,
      isPublished,
    });

    const savedBlog = await blog.save();

    // Update category and tag counts (non-blocking - don't fail if this errors)
    try {
      // Generate slug for categories to avoid null slug duplicates
      const categoryUpdates = normalizedCategories.map(async (catName) => {
        try {
          // Ensure category name is clean (no brackets, quotes, backslashes)
          const cleanCatName = catName.replace(/[\[\]"\\]/g, '').trim().toLowerCase();
          if (!cleanCatName) return null;
          
          const slug = cleanCatName.replace(/\s+/g, '-').replace(/[^\w-]+/g, '') || `category-${Date.now()}`;
          return Category.findOneAndUpdate(
            { name: cleanCatName },
            { 
              $setOnInsert: { 
                name: cleanCatName,
                slug: slug,
                blogCount: 0
              },
              $inc: { blogCount: 1 }
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          );
        } catch (catError) {
          logger.warn(`Error updating category ${catName}:`, catError.message);
          // Try to just increment if category exists
          try {
            await Category.findOneAndUpdate(
              { name: catName },
              { $inc: { blogCount: 1 } }
            );
          } catch (e) {
            // Ignore if category doesn't exist
          }
          return null;
        }
      });

      const tagUpdates = normalizedTags.map(async (tagName) => {
        try {
          // Ensure tag name is clean (no brackets, quotes, backslashes)
          const cleanTagName = tagName.replace(/[\[\]"\\]/g, '').trim().toLowerCase();
          if (!cleanTagName) return null;
          
          return Tag.findOneAndUpdate(
            { name: cleanTagName },
            { 
              $setOnInsert: { 
                name: cleanTagName,
                blogCount: 0
              },
              $inc: { blogCount: 1 }
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          );
        } catch (tagError) {
          logger.warn(`Error updating tag ${tagName}:`, tagError.message);
          // Try to just increment if tag exists
          try {
            await Tag.findOneAndUpdate(
              { name: tagName },
              { $inc: { blogCount: 1 } }
            );
          } catch (e) {
            // Ignore if tag doesn't exist
          }
          return null;
        }
      });

      await Promise.all([...categoryUpdates, ...tagUpdates]);
    } catch (updateError) {
      // Log but don't fail - blog is already created
      logger.warn('Error updating category/tag counts (non-critical):', updateError.message);
    }

    return {
      ...savedBlog.toObject(),
      id: savedBlog._id.toString(),
      _id: undefined,
    };
  } catch (error) {
    logger.error('Error creating blog:', error.message);
    throw error;
  }
};

/**
 * Update an existing blog
 * @param {string} id - Blog ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object|null>} Updated blog or null
 */
const updateBlog = async (id, updates) => {
  try {
    if (!isDatabaseConnected()) {
      throw new Error('Database not connected');
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }

    const existingBlog = await Blog.findById(id);
    if (!existingBlog) {
      return null;
    }

    // Normalize categories and tags if provided (remove brackets/quotes/backslashes)
    if (updates.categories) {
      updates.categories = updates.categories
        .map(cat => {
          if (typeof cat !== 'string') return String(cat);
          return cat.replace(/[\[\]"\\]/g, '').trim().toLowerCase();
        })
        .filter(cat => cat.length > 0);
    }
    if (updates.tags) {
      updates.tags = updates.tags
        .map(tag => {
          if (typeof tag !== 'string') return String(tag);
          return tag.replace(/[\[\]"\\]/g, '').trim().toLowerCase();
        })
        .filter(tag => tag.length > 0);
    }

    // Update blog
    const updatedBlog = await Blog.findByIdAndUpdate(
      id,
      { ...updates, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).lean();

    // Update category and tag counts if categories/tags changed
    if (updates.categories || updates.tags) {
      // This is simplified - in production, you'd want to decrement old counts and increment new ones
      // For now, we'll just ensure categories and tags exist
      const categoriesToUpdate = updates.categories || existingBlog.categories;
      const tagsToUpdate = updates.tags || existingBlog.tags;

      await Promise.all([
        ...categoriesToUpdate.map(catName =>
          Category.findOneAndUpdate(
            { name: catName },
            { $inc: { blogCount: 1 } },
            { upsert: true, new: true }
          )
        ),
        ...tagsToUpdate.map(tagName =>
          Tag.findOneAndUpdate(
            { name: tagName },
            { $inc: { blogCount: 1 } },
            { upsert: true, new: true }
          )
        ),
      ]);
    }

    return {
      ...updatedBlog,
      id: updatedBlog._id.toString(),
      _id: undefined,
    };
  } catch (error) {
    logger.error('Error updating blog:', error.message);
    throw error;
  }
};

/**
 * Delete a blog
 * @param {string} id - Blog ID
 * @returns {Promise<boolean>} True if deleted, false if not found
 */
const deleteBlog = async (id) => {
  try {
    if (!isDatabaseConnected()) {
      throw new Error('Database not connected');
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return false;
    }

    const blog = await Blog.findByIdAndDelete(id);
    if (!blog) {
      return false;
    }

    // Decrement category and tag counts
    await Promise.all([
      ...blog.categories.map(catName =>
        Category.findOneAndUpdate(
          { name: catName },
          { $inc: { blogCount: -1 } }
        )
      ),
      ...blog.tags.map(tagName =>
        Tag.findOneAndUpdate(
          { name: tagName },
          { $inc: { blogCount: -1 } }
        )
      ),
    ]);

    return true;
  } catch (error) {
    logger.error('Error deleting blog:', error.message);
    throw error;
  }
};

/**
 * Get all categories
 * @returns {Promise<Array>} Categories
 */
const getAllCategories = async () => {
  try {
    if (!isDatabaseConnected()) {
      return [];
    }

    const categories = await Category.find()
      .sort({ name: 1 })
      .lean();

    return categories.map(cat => ({
      ...cat,
      id: cat._id.toString(),
      _id: undefined,
    }));
  } catch (error) {
    logger.error('Error getting categories:', error.message);
    return [];
  }
};

/**
 * Get all tags
 * @returns {Promise<Array>} Tags
 */
const getAllTags = async () => {
  try {
    if (!isDatabaseConnected()) {
      return [];
    }

    const tags = await Tag.find()
      .sort({ blogCount: -1, name: 1 })
      .lean();

    return tags.map(tag => ({
      ...tag,
      id: tag._id.toString(),
      _id: undefined,
    }));
  } catch (error) {
    logger.error('Error getting tags:', error.message);
    return [];
  }
};

module.exports = {
  getAllBlogs,
  getBlogById,
  createBlog,
  updateBlog,
  deleteBlog,
  getAllCategories,
  getAllTags,
};

