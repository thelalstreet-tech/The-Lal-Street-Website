// server/routes/blogs.routes.js
const express = require('express');
const router = express.Router();
const {
  handleGetAllBlogs,
  handleGetBlogById,
  handleCreateBlog,
  handleUpdateBlog,
  handleDeleteBlog,
  handleGetAllCategories,
  handleGetAllTags,
} = require('../controllers/blogs.controller');
const { checkAdminAuth } = require('../middleware/auth');
const { uploadSingle } = require('../middleware/upload');

// Public routes (no auth required)
router.get('/', handleGetAllBlogs);
router.get('/categories/all', handleGetAllCategories);
router.get('/tags/all', handleGetAllTags);
router.get('/:id', handleGetBlogById);

// Admin routes (require authentication)
router.post('/', checkAdminAuth, uploadSingle('image'), handleCreateBlog);
router.put('/:id', checkAdminAuth, uploadSingle('image'), handleUpdateBlog);
router.delete('/:id', checkAdminAuth, handleDeleteBlog);

module.exports = router;



