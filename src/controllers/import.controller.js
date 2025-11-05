const jobFetcherService = require('../services/jobFetcher.service');
const importLoggerService = require('../services/importLogger.service');
const { addBulkJobsToQueue, getQueueStats } = require('../queues/jobQueue');
const logger = require('../config/logger');

const startImport = async (req, res) => {
  const startTime = Date.now();
  let importLog = null;

  try {
    const feedUrls = req.body.urls || process.env.JOB_FEED_URLS?.split(',') || [];

    if (feedUrls.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No feed URLs provided'
      });
    }

    logger.info(`Starting manual import from ${feedUrls.length} sources`);

    importLog = await importLoggerService.createImportLog(
      feedUrls.join(', ')
    );

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

      return res.status(200).json({
        success: true,
        message: 'No jobs found to import',
        importLogId: importLog._id,
        errors
      });
    }

    await addBulkJobsToQueue(jobs, importLog._id.toString());

    const duration = Date.now() - startTime;

    await importLoggerService.updateImportLog(importLog._id, {
      totalFetched: jobs.length,
      duration,
      status: 'in-progress'
    });

    logger.info(`Import started: ${jobs.length} jobs queued for processing`);

    res.status(202).json({
      success: true,
      message: `Import started successfully. ${jobs.length} jobs queued for processing.`,
      importLogId: importLog._id,
      totalJobs: jobs.length,
      queuedAt: new Date()
    });

  } catch (error) {
    logger.error(`Error starting import: ${error.message}`);

    if (importLog) {
      const duration = Date.now() - startTime;
      await importLoggerService.markImportFailed(
        importLog._id,
        error.message,
        duration
      );
    }

    res.status(500).json({
      success: false,
      message: 'Failed to start import',
      error: error.message
    });
  }
};

const getImportLogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const result = await importLoggerService.getImportLogs(page, limit);

    res.status(200).json({
      success: true,
      data: result.logs,
      pagination: result.pagination
    });
  } catch (error) {
    logger.error(`Error fetching import logs: ${error.message}`);
    
    res.status(500).json({
      success: false,
      message: 'Failed to fetch import logs',
      error: error.message
    });
  }
};

const getImportLogById = async (req, res) => {
  try {
    const { id } = req.params;
    const importLog = await importLoggerService.getImportLogById(id);

    res.status(200).json({
      success: true,
      data: importLog
    });
  } catch (error) {
    logger.error(`Error fetching import log: ${error.message}`);
    
    const statusCode = error.message.includes('not found') ? 404 : 500;
    
    res.status(statusCode).json({
      success: false,
      message: 'Failed to fetch import log',
      error: error.message
    });
  }
};

const getImportStats = async (req, res) => {
  try {
    const stats = await importLoggerService.getImportStats();

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error(`Error fetching import stats: ${error.message}`);
    
    res.status(500).json({
      success: false,
      message: 'Failed to fetch import statistics',
      error: error.message
    });
  }
};

const getQueueStatistics = async (req, res) => {
  try {
    const stats = await getQueueStats();

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error(`Error fetching queue stats: ${error.message}`);
    
    res.status(500).json({
      success: false,
      message: 'Failed to fetch queue statistics',
      error: error.message
    });
  }
};

module.exports = {
  startImport,
  getImportLogs,
  getImportLogById,
  getImportStats,
  getQueueStatistics
};

