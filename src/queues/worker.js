const { Worker } = require('bullmq');
const createRedisConnection = require('../config/redis');
const connectDB = require('../config/db');
const jobProcessorService = require('../services/jobProcessor.service');
const logger = require('../config/logger');

// Connect to MongoDB
connectDB();

// Create Redis connection for the worker
const connection = createRedisConnection();

// Worker concurrency from environment or default to 5
const concurrency = parseInt(process.env.WORKER_CONCURRENCY) || 5;

// Create BullMQ Worker
const worker = new Worker(
  'job-processing',
  async (job) => {
    const { jobData, importLogId } = job.data;
    
    logger.debug(`Processing job: ${jobData.externalId} for import ${importLogId}`);

    try {
      // Process the job using the job processor service
      const result = await jobProcessorService.processJob(jobData);

      if (result.success) {
        logger.debug(`Successfully processed job: ${jobData.externalId} - ${result.action}`);
        return {
          success: true,
          action: result.action,
          externalId: jobData.externalId
        };
      } else {
        throw new Error(result.error || 'Job processing failed');
      }
    } catch (error) {
      logger.error(`Error processing job ${jobData.externalId}: ${error.message}`);
      throw error; // Re-throw to trigger retry mechanism
    }
  },
  {
    connection,
    concurrency,
    limiter: {
      max: 100, // Max 100 jobs
      duration: 1000 // Per second
    }
  }
);

// Worker event listeners
worker.on('completed', (job, result) => {
  logger.info(`Job ${job.id} completed - Action: ${result.action}`);
});

worker.on('failed', (job, error) => {
  logger.error(`Job ${job?.id} failed: ${error.message}`);
});

worker.on('error', (error) => {
  logger.error(`Worker error: ${error.message}`);
});

worker.on('stalled', (jobId) => {
  logger.warn(`Job ${jobId} stalled`);
});

worker.on('active', (job) => {
  logger.debug(`Job ${job.id} is now active`);
});

// Handle graceful shutdown
const gracefulShutdown = async () => {
  logger.info('Shutting down worker gracefully...');
  
  try {
    await worker.close();
    await connection.quit();
    logger.info('Worker shut down successfully');
    process.exit(0);
  } catch (error) {
    logger.error(`Error during shutdown: ${error.message}`);
    process.exit(1);
  }
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Log worker start
logger.info(`Worker started with concurrency: ${concurrency}`);
logger.info('Waiting for jobs...');

module.exports = worker;

