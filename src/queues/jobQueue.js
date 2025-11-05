const { Queue } = require('bullmq');
const createRedisConnection = require('../config/redis');
const logger = require('../config/logger');

// Create Redis connection for the queue
const connection = createRedisConnection();

// Create BullMQ Queue
const jobQueue = new Queue('job-processing', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    },
    removeOnComplete: {
      age: 3600, // Keep completed jobs for 1 hour
      count: 1000 // Keep last 1000 completed jobs
    },
    removeOnFail: {
      age: 86400 // Keep failed jobs for 24 hours
    }
  }
});

// Queue event listeners
jobQueue.on('error', (error) => {
  logger.error(`Queue error: ${error.message}`);
});

/**
 * Add a single job to the queue
 * @param {Object} jobData - Job data to process
 * @param {string} importLogId - Associated import log ID
 * @returns {Promise<Object>} Queue job
 */
const addJobToQueue = async (jobData, importLogId) => {
  try {
    const job = await jobQueue.add(
      'process-job',
      {
        jobData,
        importLogId
      },
      {
        jobId: jobData.externalId // Use externalId as job ID to prevent duplicates
      }
    );

    logger.debug(`Added job to queue: ${jobData.externalId}`);
    return job;
  } catch (error) {
    logger.error(`Error adding job to queue: ${error.message}`);
    throw error;
  }
};

/**
 * Add multiple jobs to the queue in bulk
 * @param {Array} jobs - Array of job data
 * @param {string} importLogId - Associated import log ID
 * @returns {Promise<Array>} Array of queue jobs
 */
const addBulkJobsToQueue = async (jobs, importLogId) => {
  try {
    const bulkJobs = jobs.map(jobData => ({
      name: 'process-job',
      data: {
        jobData,
        importLogId
      },
      opts: {
        jobId: `${importLogId}-${jobData.externalId}` // Unique job ID per import
      }
    }));

    const addedJobs = await jobQueue.addBulk(bulkJobs);
    logger.info(`Added ${addedJobs.length} jobs to queue for import ${importLogId}`);
    
    return addedJobs;
  } catch (error) {
    logger.error(`Error adding bulk jobs to queue: ${error.message}`);
    throw error;
  }
};

/**
 * Get queue statistics
 * @returns {Promise<Object>} Queue statistics
 */
const getQueueStats = async () => {
  try {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      jobQueue.getWaitingCount(),
      jobQueue.getActiveCount(),
      jobQueue.getCompletedCount(),
      jobQueue.getFailedCount(),
      jobQueue.getDelayedCount()
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + completed + failed + delayed
    };
  } catch (error) {
    logger.error(`Error getting queue stats: ${error.message}`);
    return null;
  }
};

/**
 * Clean the queue (remove old jobs)
 * @returns {Promise<void>}
 */
const cleanQueue = async () => {
  try {
    await jobQueue.clean(3600 * 1000, 1000, 'completed'); // Clean completed jobs older than 1 hour
    await jobQueue.clean(86400 * 1000, 500, 'failed'); // Clean failed jobs older than 24 hours
    logger.info('Queue cleaned successfully');
  } catch (error) {
    logger.error(`Error cleaning queue: ${error.message}`);
  }
};

/**
 * Pause the queue
 * @returns {Promise<void>}
 */
const pauseQueue = async () => {
  try {
    await jobQueue.pause();
    logger.info('Queue paused');
  } catch (error) {
    logger.error(`Error pausing queue: ${error.message}`);
  }
};

/**
 * Resume the queue
 * @returns {Promise<void>}
 */
const resumeQueue = async () => {
  try {
    await jobQueue.resume();
    logger.info('Queue resumed');
  } catch (error) {
    logger.error(`Error resuming queue: ${error.message}`);
  }
};

/**
 * Close the queue connection
 * @returns {Promise<void>}
 */
const closeQueue = async () => {
  try {
    await jobQueue.close();
    await connection.quit();
    logger.info('Queue closed');
  } catch (error) {
    logger.error(`Error closing queue: ${error.message}`);
  }
};

module.exports = {
  jobQueue,
  addJobToQueue,
  addBulkJobsToQueue,
  getQueueStats,
  cleanQueue,
  pauseQueue,
  resumeQueue,
  closeQueue
};

