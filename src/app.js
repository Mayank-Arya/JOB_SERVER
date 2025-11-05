require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const connectDB = require('./config/db');
const logger = require('./config/logger');
const jobFetcherService = require('./services/jobFetcher.service');
const importLoggerService = require('./services/importLogger.service');
const { addBulkJobsToQueue, closeQueue } = require('./queues/jobQueue');

// Initialize Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date()
  });
});

// API Routes
app.use('/api/import', require('./routes/import.routes'));
app.use('/api/jobs', require('./routes/job.routes'));

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(`Error: ${err.message}`);
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

/**
 * Automated job import function
 * Called by cron scheduler
 */
const automatedImport = async () => {
  const startTime = Date.now();
  let importLog = null;

  try {
    const feedUrls = process.env.JOB_FEED_URLS?.split(',').map(url => url.trim()) || [];

    if (feedUrls.length === 0) {
      logger.warn('No feed URLs configured for automated import');
      return;
    }

    logger.info(`Starting automated import from ${feedUrls.length} sources`);

    // Create import log
    importLog = await importLoggerService.createImportLog(
      `Automated: ${feedUrls.join(', ')}`
    );

    // Fetch jobs from all URLs
    const { jobs, errors } = await jobFetcherService.fetchFromMultipleURLs(feedUrls);

    if (jobs.length === 0) {
      const duration = Date.now() - startTime;
      await importLoggerService.updateImportLog(importLog._id, {
        totalFetched: 0,
        newJobs: 0,
        updatedJobs: 0,
        failedJobs: 0,
        failedReasons: errors.map(e => e.error),
        duration,
        status: errors.length > 0 ? 'failed' : 'completed'
      });

      logger.info('Automated import completed: No jobs found');
      return;
    }

    // Add jobs to queue for processing
    await addBulkJobsToQueue(jobs, importLog._id.toString());

    const duration = Date.now() - startTime;

    // Update import log with initial stats
    await importLoggerService.updateImportLog(importLog._id, {
      totalFetched: jobs.length,
      duration,
      status: 'in-progress'
    });

    logger.info(`Automated import completed: ${jobs.length} jobs queued for processing`);

  } catch (error) {
    logger.error(`Error in automated import: ${error.message}`);

    // Mark import as failed if log was created
    if (importLog) {
      const duration = Date.now() - startTime;
      await importLoggerService.markImportFailed(
        importLog._id,
        error.message,
        duration
      );
    }
  }
};

/**
 * Initialize the application
 */
const initializeApp = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Start cron job for automated imports
    const cronSchedule = process.env.CRON_SCHEDULE || '0 * * * *'; // Default: every hour
    
    cron.schedule(cronSchedule, () => {
      logger.info('Cron job triggered: Starting automated import');
      automatedImport();
    });

    logger.info(`Cron job scheduled: ${cronSchedule}`);

    // Start server
    const PORT = process.env.PORT || 5000;
    const server = app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal) => {
      logger.info(`${signal} received: Closing server gracefully...`);
      
      server.close(async () => {
        logger.info('HTTP server closed');
        
        try {
          await closeQueue();
          process.exit(0);
        } catch (error) {
          logger.error(`Error during shutdown: ${error.message}`);
          process.exit(1);
        }
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    logger.error(`Failed to initialize application: ${error.message}`);
    process.exit(1);
  }
};

// Start the application
initializeApp();

module.exports = app;

