// server/server.js

// Import necessary packages
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const passport = require('passport');
require('dotenv').config(); // Loads .env variables
const calculatorRoutes = require('./routes/calculator.routes.js');
const connectDB = require('./config/database');
const logger = require('./utils/logger');

// Initialize the express app
const app = express();

// Trust proxy - Required for Render and other hosting platforms
// This allows Express to properly read X-Forwarded-For headers for rate limiting
// Reads TRUST_PROXY env variable (number of proxy hops to trust), defaults to 1
const trustProxyCount = parseInt(process.env.TRUST_PROXY, 10) || 1;
app.set('trust proxy', trustProxyCount);

// Track server stats
let requestCount = 0;
let errorCount = 0;
const startTime = Date.now();

// --- Middlewares ---
// CORS Configuration - allows frontend to connect from different domain
// In production, set ALLOWED_ORIGINS env variable
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : ['http://localhost:5173', 'http://localhost:3000'];

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // In development mode, allow all origins
    if (process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    
    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn(`CORS blocked origin: ${origin}`);
      logger.warn(`Allowed origins: ${allowedOrigins.join(', ')}`);
      callback(new Error(`CORS: Origin ${origin} is not allowed. Configure ALLOWED_ORIGINS environment variable.`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// This middleware allows our server to understand JSON data sent in request bodies.
// We'll need this for our calculator forms later.
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Initialize Passport
app.use(passport.initialize());

// Request counter middleware
app.use((req, res, next) => {
  requestCount++;
  const originalSend = res.send;
  res.send = function(data) {
    if (res.statusCode >= 400) errorCount++;
    return originalSend.apply(res, arguments);
  };
  next();
});

// --- Rate Limiting Configuration ---
// General API rate limit
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Max 100 requests per windowMs per IP
  message: {
    status: 429,
    message: 'Too many requests from this IP, please try again after 15 minutes.'
  },
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false,
  // Skip rate limiting for health check and auth status check
  skip: (req) => {
    return req.path === '/api/health' || req.path === '/api/auth/me';
  }
});

// More strict rate limit for expensive calculator operations
const calculatorLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20, // Max 20 calculations per 5 minutes
  message: {
    status: 429,
    message: 'Too many calculations, please wait before trying again.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Apply rate limiting to all API routes
app.use('/api/', apiLimiter);

// Apply stricter limits to calculator routes
app.use('/api/calculator', calculatorLimiter);

app.use('/api/calculator', calculatorRoutes);

// --- Routes ---
const fundsRoutes = require('./routes/funds.routes.js');
app.use('/api/funds', fundsRoutes);

const suggestedBucketsRoutes = require('./routes/suggestedBuckets.routes.js');
app.use('/api/suggested-buckets', suggestedBucketsRoutes);

// Auth routes
const authRoutes = require('./routes/auth.routes.js');
app.use('/api/auth', authRoutes);

// Blogs routes
const blogsRoutes = require('./routes/blogs.routes.js');
app.use('/api/blogs', blogsRoutes);

// Bucket live returns routes
const bucketLiveReturnsRoutes = require('./routes/bucketLiveReturns.routes.js');
app.use('/api/bucket-live-returns', bucketLiveReturnsRoutes);

// Enhanced health check route with server statistics
app.get('/api/health', (req, res) => {
  const uptime = Math.floor((Date.now() - startTime) / 1000);
  const memoryUsage = process.memoryUsage();
  
  res.json({ 
    status: 'ok',
    message: 'Backend server is running successfully!',
    uptime: `${uptime}s`,
    timestamp: new Date().toISOString(),
    memory: {
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + 'MB',
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + 'MB',
      rss: Math.round(memoryUsage.rss / 1024 / 1024) + 'MB'
    },
    stats: {
      totalRequests: requestCount,
      errorCount: errorCount,
      successRate: requestCount > 0 
        ? ((requestCount - errorCount) / requestCount * 100).toFixed(2) + '%' 
        : '100%'
    }
  });
});

// Debug endpoint to check environment variables (remove in production)
app.get('/api/debug/env', (req, res) => {
  res.json({
    hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
    hasGoogleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
    googleClientIdLength: process.env.GOOGLE_CLIENT_ID?.length || 0,
    googleClientSecretLength: process.env.GOOGLE_CLIENT_SECRET?.length || 0,
    hasMongoDB: !!process.env.MONGODB_URI,
    hasJWTSecret: !!process.env.JWT_SECRET,
    nodeEnv: process.env.NODE_ENV,
    // Don't expose actual secrets, just show if they exist
    googleClientIdPreview: process.env.GOOGLE_CLIENT_ID ? 
      process.env.GOOGLE_CLIENT_ID.substring(0, 20) + '...' : 'NOT SET',
    allEnvKeys: Object.keys(process.env).filter(key => 
      key.includes('GOOGLE') || key.includes('MONGODB') || key.includes('JWT')
    )
  });
});




// --- Connect to Database ---
// Connect to MongoDB before starting server (non-blocking)
// Initialize scheduled jobs (if enabled) - must be before connectDB
if (process.env.USE_NODE_CRON === 'true') {
  require('./jobs/dailyRecalculation.job.js');
  logger.info('Scheduled jobs initialized');
}

connectDB().then((connected) => {
  if (connected) {
    logger.info('Database connection established');
  } else {
    logger.warn('Database connection not available. Some features may be disabled.');
  }
}).catch((error) => {
  logger.error('Failed to connect to MongoDB:', error);
  logger.warn('Server will continue, but authentication features will be disabled.');
});

// --- Start the Server ---
// Get the port from the .env file, or default to 5000
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  logger.info(`Server is running on http://localhost:${PORT}`);
  logger.info(`Health check: http://localhost:${PORT}/api/health`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// --- Graceful Shutdown Handlers ---
const gracefulShutdown = (signal) => {
  logger.info(`${signal} signal received: closing HTTP server`);
  server.close(() => {
    logger.info('HTTP server closed');
    logger.info('Cleaning up resources...');
    process.exit(0);
  });
  
  // Force close after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

// Handle various termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit on unhandled rejection, just log it
});