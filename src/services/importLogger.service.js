const ImportLog = require('../models/ImportLog.model');
const logger = require('../config/logger');

class ImportLoggerService {
  /**
   * Create a new import log entry
   * @param {string} fileName - Source file/URL name
   * @returns {Promise<Object>} Created import log
   */
  async createImportLog(fileName) {
    try {
      const importLog = new ImportLog({
        fileName,
        timestamp: new Date(),
        status: 'in-progress'
      });

      await importLog.save();
      logger.info(`Created import log: ${importLog._id} for ${fileName}`);
      
      return importLog;
    } catch (error) {
      logger.error(`Error creating import log: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update import log with processing results
   * @param {string} logId - Import log ID
   * @param {Object} stats - Processing statistics
   * @returns {Promise<Object>} Updated import log
   */
  async updateImportLog(logId, stats) {
    try {
      const updateData = {
        totalFetched: stats.totalFetched || 0,
        newJobs: stats.newJobs || stats.created || 0,
        updatedJobs: stats.updatedJobs || stats.updated || 0,
        failedJobs: stats.failedJobs || stats.failed || 0,
        failedReasons: stats.failedReasons || stats.errors || [],
        duration: stats.duration || 0,
        status: stats.status || 'completed'
      };

      const importLog = await ImportLog.findByIdAndUpdate(
        logId,
        updateData,
        { new: true }
      );

      if (!importLog) {
        throw new Error(`Import log ${logId} not found`);
      }

      logger.info(`Updated import log: ${logId} - Status: ${importLog.status}`);
      return importLog;
    } catch (error) {
      logger.error(`Error updating import log ${logId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Mark import log as failed
   * @param {string} logId - Import log ID
   * @param {string} reason - Failure reason
   * @param {number} duration - Duration in milliseconds
   * @returns {Promise<Object>} Updated import log
   */
  async markImportFailed(logId, reason, duration = 0) {
    try {
      const importLog = await ImportLog.findByIdAndUpdate(
        logId,
        {
          status: 'failed',
          failedReasons: [reason],
          duration
        },
        { new: true }
      );

      logger.error(`Import log ${logId} marked as failed: ${reason}`);
      return importLog;
    } catch (error) {
      logger.error(`Error marking import log as failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all import logs with pagination
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @returns {Promise<Object>} Paginated import logs
   */
  async getImportLogs(page = 1, limit = 20) {
    try {
      const skip = (page - 1) * limit;
      
      const [logs, total] = await Promise.all([
        ImportLog.find()
          .sort({ timestamp: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        ImportLog.countDocuments()
      ]);

      return {
        logs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error(`Error fetching import logs: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get a specific import log by ID
   * @param {string} logId - Import log ID
   * @returns {Promise<Object>} Import log
   */
  async getImportLogById(logId) {
    try {
      const importLog = await ImportLog.findById(logId).lean();
      
      if (!importLog) {
        throw new Error(`Import log ${logId} not found`);
      }

      return importLog;
    } catch (error) {
      logger.error(`Error fetching import log ${logId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get import statistics
   * @returns {Promise<Object>} Import statistics
   */
  async getImportStats() {
    try {
      const [totalImports, recentImports, successRate] = await Promise.all([
        ImportLog.countDocuments(),
        ImportLog.countDocuments({
          timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        }),
        this.calculateSuccessRate()
      ]);

      const lastImport = await ImportLog.findOne()
        .sort({ timestamp: -1 })
        .lean();

      return {
        totalImports,
        recentImports,
        successRate,
        lastImport
      };
    } catch (error) {
      logger.error(`Error getting import stats: ${error.message}`);
      return null;
    }
  }

  /**
   * Calculate import success rate
   * @returns {Promise<number>} Success rate percentage
   */
  async calculateSuccessRate() {
    try {
      const [completed, total] = await Promise.all([
        ImportLog.countDocuments({ status: 'completed' }),
        ImportLog.countDocuments()
      ]);

      return total > 0 ? ((completed / total) * 100).toFixed(2) : 0;
    } catch (error) {
      logger.error(`Error calculating success rate: ${error.message}`);
      return 0;
    }
  }

  /**
   * Clean up old import logs (optional maintenance)
   * @param {number} daysOld - Delete logs older than this many days
   * @returns {Promise<number>} Number of deleted logs
   */
  async cleanupOldLogs(daysOld = 30) {
    try {
      const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
      const result = await ImportLog.deleteMany({
        timestamp: { $lt: cutoffDate }
      });

      logger.info(`Cleaned up ${result.deletedCount} import logs older than ${daysOld} days`);
      return result.deletedCount;
    } catch (error) {
      logger.error(`Error cleaning up old logs: ${error.message}`);
      return 0;
    }
  }
}

module.exports = new ImportLoggerService();

