const express = require('express');
const router = express.Router();
const importController = require('../controllers/import.controller');

router.post('/start', importController.startImport);

router.get('/logs', importController.getImportLogs);

/**
 * @route   GET /api/import/logs/:id
 * @desc    Get specific import log by ID
 * @access  Public (should be protected in production)
 */
router.get('/logs/:id', importController.getImportLogById);

/**
 * @route   GET /api/import/stats
 * @desc    Get import statistics
 * @access  Public (should be protected in production)
 */
router.get('/stats', importController.getImportStats);

/**
 * @route   GET /api/import/queue-stats
 * @desc    Get queue statistics
 * @access  Public (should be protected in production)
 */
router.get('/queue-stats', importController.getQueueStatistics);

module.exports = router;

