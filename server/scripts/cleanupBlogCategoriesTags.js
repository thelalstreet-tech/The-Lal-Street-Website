// server/scripts/cleanupBlogCategoriesTags.js
// Script to clean up malformed categories and tags in the database

const mongoose = require('mongoose');
require('dotenv').config();
const Blog = require('../models/Blog');
const Category = require('../models/Category');
const Tag = require('../models/Tag');
const logger = require('../utils/logger');

// Helper to clean a string (remove brackets, quotes, backslashes, trim)
const cleanString = (str) => {
  if (!str || typeof str !== 'string') return '';
  return str.replace(/[\[\]"\\]/g, '').trim();
};

// Helper to clean an array
const cleanArray = (arr) => {
  if (!arr) return [];
  if (!Array.isArray(arr)) {
    // Try to parse as string
    if (typeof arr === 'string') {
      try {
        const parsed = JSON.parse(arr);
        if (Array.isArray(parsed)) {
          arr = parsed;
        } else {
          arr = arr.replace(/^\[|\]$/g, '').replace(/"/g, '').split(',').map(s => s.trim()).filter(s => s);
        }
      } catch {
        arr = arr.replace(/^\[|\]$/g, '').replace(/"/g, '').split(',').map(s => s.trim()).filter(s => s);
      }
    } else {
      return [];
    }
  }
  
  return arr
    .map(item => cleanString(String(item)))
    .filter(item => item.length > 0);
};

async function cleanupBlogs() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      logger.error('MONGODB_URI not found in environment variables');
      process.exit(1);
    }

    await mongoose.connect(mongoUri);
    logger.info('Connected to MongoDB');

    // Get all blogs
    const blogs = await Blog.find({});
    logger.info(`Found ${blogs.length} blogs to process`);

    let updated = 0;
    let categoriesToClean = new Set();
    let tagsToClean = new Set();

    for (const blog of blogs) {
      let needsUpdate = false;
      const originalCategories = blog.categories || [];
      const originalTags = blog.tags || [];

      // Clean categories
      const cleanedCategories = cleanArray(blog.categories);
      if (JSON.stringify(originalCategories) !== JSON.stringify(cleanedCategories)) {
        blog.categories = cleanedCategories;
        needsUpdate = true;
        cleanedCategories.forEach(cat => categoriesToClean.add(cat));
      }

      // Clean tags
      const cleanedTags = cleanArray(blog.tags);
      if (JSON.stringify(originalTags) !== JSON.stringify(cleanedTags)) {
        blog.tags = cleanedTags;
        needsUpdate = true;
        cleanedTags.forEach(tag => tagsToClean.add(tag));
      }

      if (needsUpdate) {
        await blog.save();
        updated++;
        logger.info(`Updated blog: ${blog.title} (ID: ${blog._id})`);
      }
    }

    logger.info(`\nUpdated ${updated} blogs`);

    // Clean up categories
    logger.info('\nCleaning up categories...');
    const categories = await Category.find({});
    let categoriesUpdated = 0;
    let categoriesDeleted = 0;

    for (const category of categories) {
      const cleanedName = cleanString(category.name);
      
      if (cleanedName !== category.name) {
        // Check if a clean version already exists
        const existingClean = await Category.findOne({ name: cleanedName });
        
        if (existingClean) {
          // Merge: add blogCount and delete the dirty one
          existingClean.blogCount += category.blogCount;
          await existingClean.save();
          await Category.findByIdAndDelete(category._id);
          categoriesDeleted++;
          logger.info(`Merged category "${category.name}" into "${cleanedName}"`);
        } else {
          // Update the name
          category.name = cleanedName;
          const slug = cleanedName.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
          category.slug = slug;
          await category.save();
          categoriesUpdated++;
          logger.info(`Updated category: "${category.name}" -> "${cleanedName}"`);
        }
      }
    }

    // Clean up tags
    logger.info('\nCleaning up tags...');
    const tags = await Tag.find({});
    let tagsUpdated = 0;
    let tagsDeleted = 0;

    for (const tag of tags) {
      const cleanedName = cleanString(tag.name);
      
      if (cleanedName !== tag.name) {
        // Check if a clean version already exists
        const existingClean = await Tag.findOne({ name: cleanedName });
        
        if (existingClean) {
          // Merge: add blogCount and delete the dirty one
          existingClean.blogCount += tag.blogCount;
          await existingClean.save();
          await Tag.findByIdAndDelete(tag._id);
          tagsDeleted++;
          logger.info(`Merged tag "${tag.name}" into "${cleanedName}"`);
        } else {
          // Update the name
          tag.name = cleanedName;
          await tag.save();
          tagsUpdated++;
          logger.info(`Updated tag: "${tag.name}" -> "${cleanedName}"`);
        }
      }
    }

    logger.info(`\n=== Cleanup Summary ===`);
    logger.info(`Blogs updated: ${updated}`);
    logger.info(`Categories updated: ${categoriesUpdated}`);
    logger.info(`Categories merged/deleted: ${categoriesDeleted}`);
    logger.info(`Tags updated: ${tagsUpdated}`);
    logger.info(`Tags merged/deleted: ${tagsDeleted}`);

    await mongoose.disconnect();
    logger.info('\nCleanup completed successfully!');
    process.exit(0);
  } catch (error) {
    logger.error('Error during cleanup:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run cleanup
cleanupBlogs();

