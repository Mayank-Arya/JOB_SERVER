const Job = require('../models/Job.model');
const logger = require('../config/logger');

class JobProcessorService {

  async processJob(jobData) {
    try {
      // Validate required fields
      if (!jobData.externalId || !jobData.title || !jobData.company || !jobData.url) {
        throw new Error('Missing required fields: externalId, title, company, or url');
      }

      const existingJob = await Job.findOne({
        $or: [
          { externalId: jobData.externalId },
          { url: jobData.url }
        ]
      });

      if (existingJob) {
        Object.assign(existingJob, {
          ...jobData,
          updatedAt: new Date()
        });
        
        await existingJob.save();
        
        logger.debug(`Updated job: ${jobData.title} at ${jobData.company}`);
        
        return {
          success: true,
          action: 'updated',
          job: existingJob
        };
      } else {
        const newJob = new Job(jobData);
        await newJob.save();
        
        logger.debug(`Created new job: ${jobData.title} at ${jobData.company}`);
        
        return {
          success: true,
          action: 'created',
          job: newJob
        };
      }
    } catch (error) {
      logger.error(`Error processing job ${jobData.externalId}: ${error.message}`);
      
      return {
        success: false,
        action: 'failed',
        error: error.message,
        jobData
      };
    }
  }

  async batchProcessJobs(jobs) {
    const stats = {
      total: jobs.length,
      created: 0,
      updated: 0,
      failed: 0,
      errors: []
    };

    const results = await Promise.allSettled(
      jobs.map(job => this.processJob(job))
    );

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const { success, action, error } = result.value;
        
        if (success) {
          if (action === 'created') {
            stats.created++;
          } else if (action === 'updated') {
            stats.updated++;
          }
        } else {
          stats.failed++;
          stats.errors.push(error || 'Unknown error');
        }
      } else {
        stats.failed++;
        stats.errors.push(result.reason?.message || 'Processing failed');
      }
    });

    logger.info(`Batch processing complete: ${stats.created} created, ${stats.updated} updated, ${stats.failed} failed`);
    
    return stats;
  }

  async getJobStats() {
    try {
      const totalJobs = await Job.countDocuments();
      const recentJobs = await Job.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      });
      
      const companiesCount = await Job.distinct('company').then(companies => companies.length);
      const categoriesCount = await Job.distinct('category').then(categories => categories.length);

      return {
        totalJobs,
        recentJobs,
        companiesCount,
        categoriesCount
      };
    } catch (error) {
      logger.error(`Error getting job stats: ${error.message}`);
      return null;
    }
  }

  async cleanupOldJobs(daysOld = 90) {
    try {
      const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
      const result = await Job.deleteMany({
        updatedAt: { $lt: cutoffDate }
      });

      logger.info(`Cleaned up ${result.deletedCount} jobs older than ${daysOld} days`);
      return result.deletedCount;
    } catch (error) {
      logger.error(`Error cleaning up old jobs: ${error.message}`);
      return 0;
    }
  }
}

module.exports = new JobProcessorService();

