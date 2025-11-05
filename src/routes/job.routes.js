const express = require('express');
const router = express.Router();
const Job = require('../models/Job.model');
const logger = require('../config/logger');

/**
 * @route   GET /api/jobs
 * @desc    Get all jobs with pagination and filters
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Build filter query
    const filter = {};
    
    if (req.query.company) {
      filter.company = new RegExp(req.query.company, 'i');
    }
    
    if (req.query.category) {
      filter.category = req.query.category;
    }
    
    if (req.query.type) {
      filter.type = req.query.type;
    }
    
    if (req.query.location) {
      filter.location = new RegExp(req.query.location, 'i');
    }
    
    if (req.query.search) {
      filter.$or = [
        { title: new RegExp(req.query.search, 'i') },
        { description: new RegExp(req.query.search, 'i') },
        { company: new RegExp(req.query.search, 'i') }
      ];
    }

    // Execute query
    const [jobs, total] = await Promise.all([
      Job.find(filter)
        .sort({ postedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Job.countDocuments(filter)
    ]);

    res.status(200).json({
      success: true,
      data: jobs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error(`Error fetching jobs: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch jobs',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/jobs/:id
 * @desc    Get single job by ID
 * @access  Public
 */
router.get('/:id', async (req, res) => {
  try {
    const job = await Job.findById(req.params.id).lean();

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    res.status(200).json({
      success: true,
      data: job
    });
  } catch (error) {
    logger.error(`Error fetching job: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch job',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/jobs/stats/summary
 * @desc    Get job statistics summary
 * @access  Public
 */
router.get('/stats/summary', async (req, res) => {
  try {
    const [totalJobs, companies, categories, types] = await Promise.all([
      Job.countDocuments(),
      Job.distinct('company'),
      Job.distinct('category'),
      Job.aggregate([
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalJobs,
        totalCompanies: companies.length,
        totalCategories: categories.length,
        jobTypes: types
      }
    });
  } catch (error) {
    logger.error(`Error fetching job stats: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch job statistics',
      error: error.message
    });
  }
});

module.exports = router;

