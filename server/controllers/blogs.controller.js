// server/controllers/blogs.controller.js
const {
  getAllBlogs,
  getBlogById,
  createBlog,
  updateBlog,
  deleteBlog,
  getAllCategories,
  getAllTags,
} = require('../services/blogs.service');
const { uploadImage, deleteImage } = require('../config/cloudinary');
const logger = require('../utils/logger');

/**
 * GET /api/blogs
 * Get all blogs with filters
 */
const handleGetAllBlogs = async (req, res) => {
  try {
    const filters = {
      category: req.query.category,
      tags: req.query.tags ? (Array.isArray(req.query.tags) ? req.query.tags : [req.query.tags]) : undefined,
      exclusive: req.query.exclusive === 'true' ? true : req.query.exclusive === 'false' ? false : undefined,
      search: req.query.search,
      isPublished: req.query.isPublished !== 'false', // Default to true for public
      sortBy: req.query.sortBy || 'createdAt',
      sortOrder: req.query.sortOrder || 'desc',
      limit: req.query.limit || 50,
      skip: req.query.skip || 0,
    };

    const result = await getAllBlogs(filters);

    res.json({
      success: true,
      data: result.blogs,
      pagination: {
        total: result.total,
        limit: result.limit,
        skip: result.skip,
        hasMore: result.skip + result.blogs.length < result.total,
      },
    });
  } catch (error) {
    logger.error('Error getting all blogs:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error fetching blogs',
      error: error.message,
    });
  }
};

/**
 * GET /api/blogs/:id
 * Get a single blog by ID
 */
const handleGetBlogById = async (req, res) => {
  try {
    const { id } = req.params;
    const blog = await getBlogById(id);

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found',
      });
    }

    res.json({
      success: true,
      data: blog,
    });
  } catch (error) {
    logger.error('Error getting blog by ID:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error fetching blog',
      error: error.message,
    });
  }
};

/**
 * POST /api/blogs
 * Create a new blog (admin only)
 */
const handleCreateBlog = async (req, res) => {
  try {
    let imageUrl = req.body.imageUrl;
    let imagePublicId = req.body.imagePublicId;

    // If file is uploaded, upload to Cloudinary
    if (req.file) {
      try {
        // Convert buffer to data URI for Cloudinary
        const dataUri = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
        const uploadResult = await uploadImage(dataUri);
        imageUrl = uploadResult.url;
        imagePublicId = uploadResult.publicId;
      } catch (uploadError) {
        logger.error('Error uploading image:', uploadError.message);
        return res.status(500).json({
          success: false,
          message: 'Error uploading image',
          error: uploadError.message,
        });
      }
    }

    // Validate required fields
    if (!req.body.title || !req.body.content) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: title, content',
      });
    }

    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        message: 'Image is required. Please upload an image or provide imageUrl',
      });
    }

    // Parse categories and tags from strings, arrays, or JSON strings
    // Helper function to clean and parse
    const parseAndClean = (value) => {
      if (!value) return [];
      
      let result = [];
      
      // If already an array, use it
      if (Array.isArray(value)) {
        result = value;
      } else if (typeof value === 'string') {
        // Remove any outer brackets/quotes first
        let cleaned = value.trim();
        
        // Try to parse as JSON
        try {
          const parsed = JSON.parse(cleaned);
          if (Array.isArray(parsed)) {
            result = parsed;
          } else {
            // If not an array, treat as single value
            result = [parsed];
          }
        } catch {
          // If JSON parse fails, try to extract array-like content
          // Remove outer brackets if present
          cleaned = cleaned.replace(/^\[|\]$/g, '');
          // Remove quotes and backslashes
          cleaned = cleaned.replace(/["\\]/g, '');
          // Split by comma
          result = cleaned.split(',').map(item => item.trim()).filter(item => item);
        }
      }
      
      // Clean each item: remove brackets, quotes, backslashes, trim
      return result
        .map(item => {
          if (typeof item !== 'string') item = String(item);
          return item.replace(/[\[\]"\\]/g, '').trim();
        })
        .filter(item => item.length > 0);
    };

    const categories = parseAndClean(req.body.categories);
    const tags = parseAndClean(req.body.tags);

    const blogData = {
      title: req.body.title,
      content: req.body.content,
      imageUrl,
      imagePublicId,
      categories,
      tags,
      exclusive: req.body.exclusive === true || req.body.exclusive === 'true',
      author: req.body.author || 'The Lal Street',
      isPublished: req.body.isPublished !== false && req.body.isPublished !== 'false',
    };

    const newBlog = await createBlog(blogData);

    res.status(201).json({
      success: true,
      data: newBlog,
      message: 'Blog created successfully',
    });
  } catch (error) {
    logger.error('Error creating blog:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error creating blog',
      error: error.message,
    });
  }
};

/**
 * PUT /api/blogs/:id
 * Update an existing blog (admin only)
 */
const handleUpdateBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };

    // If new file is uploaded, upload to Cloudinary
    if (req.file) {
      try {
        // Get existing blog to delete old image
        const existingBlog = await getBlogById(id);
        if (existingBlog && existingBlog.imagePublicId) {
          await deleteImage(existingBlog.imagePublicId);
        }

        // Upload new image
        const dataUri = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
        const uploadResult = await uploadImage(dataUri);
        updates.imageUrl = uploadResult.url;
        updates.imagePublicId = uploadResult.publicId;
      } catch (uploadError) {
        logger.error('Error uploading image:', uploadError.message);
        return res.status(500).json({
          success: false,
          message: 'Error uploading image',
          error: uploadError.message,
        });
      }
    }

    // Parse and clean categories and tags if provided
    const parseAndClean = (value) => {
      if (!value) return [];
      
      let result = [];
      
      if (Array.isArray(value)) {
        result = value;
      } else if (typeof value === 'string') {
        let cleaned = value.trim();
        try {
          const parsed = JSON.parse(cleaned);
          if (Array.isArray(parsed)) {
            result = parsed;
          } else {
            result = [parsed];
          }
        } catch {
          cleaned = cleaned.replace(/^\[|\]$/g, '');
          cleaned = cleaned.replace(/["\\]/g, '');
          result = cleaned.split(',').map(item => item.trim()).filter(item => item);
        }
      }
      
      return result
        .map(item => {
          if (typeof item !== 'string') item = String(item);
          return item.replace(/[\[\]"\\]/g, '').trim();
        })
        .filter(item => item.length > 0);
    };

    if (updates.categories !== undefined) {
      updates.categories = parseAndClean(updates.categories);
    }
    if (updates.tags !== undefined) {
      updates.tags = parseAndClean(updates.tags);
    }

    // Convert boolean strings
    if (updates.exclusive !== undefined) {
      updates.exclusive = updates.exclusive === true || updates.exclusive === 'true';
    }
    if (updates.isPublished !== undefined) {
      updates.isPublished = updates.isPublished !== false && updates.isPublished !== 'false';
    }

    // Don't allow updating ID
    delete updates.id;
    delete updates._id;

    const updatedBlog = await updateBlog(id, updates);

    if (!updatedBlog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found',
      });
    }

    res.json({
      success: true,
      data: updatedBlog,
      message: 'Blog updated successfully',
    });
  } catch (error) {
    logger.error('Error updating blog:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error updating blog',
      error: error.message,
    });
  }
};

/**
 * DELETE /api/blogs/:id
 * Delete a blog (admin only)
 */
const handleDeleteBlog = async (req, res) => {
  try {
    const { id } = req.params;

    // Get blog to delete image from Cloudinary
    const blog = await getBlogById(id);
    if (blog && blog.imagePublicId) {
      try {
        await deleteImage(blog.imagePublicId);
      } catch (deleteError) {
        logger.warn('Error deleting image from Cloudinary:', deleteError.message);
        // Continue with blog deletion even if image deletion fails
      }
    }

    const deleted = await deleteBlog(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found',
      });
    }

    res.json({
      success: true,
      message: 'Blog deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting blog:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error deleting blog',
      error: error.message,
    });
  }
};

/**
 * GET /api/blogs/categories/all
 * Get all categories
 */
const handleGetAllCategories = async (req, res) => {
  try {
    const categories = await getAllCategories();
    res.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    logger.error('Error getting categories:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error fetching categories',
      error: error.message,
    });
  }
};

/**
 * GET /api/blogs/tags/all
 * Get all tags
 */
const handleGetAllTags = async (req, res) => {
  try {
    const tags = await getAllTags();
    res.json({
      success: true,
      data: tags,
    });
  } catch (error) {
    logger.error('Error getting tags:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error fetching tags',
      error: error.message,
    });
  }
};

module.exports = {
  handleGetAllBlogs,
  handleGetBlogById,
  handleCreateBlog,
  handleUpdateBlog,
  handleDeleteBlog,
  handleGetAllCategories,
  handleGetAllTags,
};

