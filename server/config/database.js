// server/config/database.js
const mongoose = require('mongoose');
const logger = require('../utils/logger');

/**
 * Connect to MongoDB Atlas
 */
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI;
    
    if (!mongoURI) {
      logger.warn('MONGODB_URI is not defined in environment variables');
      logger.warn('Authentication features will be disabled. To enable auth, set MONGODB_URI in your .env file');
      return false; // Return false instead of throwing
    }

    const options = {
      // These options are recommended for MongoDB Atlas
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    };

    await mongoose.connect(mongoURI, options);
    
    logger.info('MongoDB connected successfully');
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      logger.info('MongoDB connection closed through app termination');
      process.exit(0);
    });

    return true; // Connection successful
  } catch (error) {
    logger.error('Error connecting to MongoDB:', error.message);
    logger.warn('Server will continue without database connection. Authentication features will be disabled.');
    // Don't throw - let server start anyway
    return false;
  }
};

module.exports = connectDB;

