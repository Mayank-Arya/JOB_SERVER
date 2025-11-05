const mongoose = require('mongoose');

const importLogSchema = new mongoose.Schema({
  fileName: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  totalFetched: {
    type: Number,
    default: 0
  },
  newJobs: {
    type: Number,
    default: 0
  },
  updatedJobs: {
    type: Number,
    default: 0
  },
  failedJobs: {
    type: Number,
    default: 0
  },
  failedReasons: [{
    type: String
  }],
  duration: {
    type: Number,
    default: 0,
    comment: 'Duration in milliseconds'
  },
  status: {
    type: String,
    enum: ['in-progress', 'completed', 'failed'],
    default: 'in-progress'
  }
}, {
  timestamps: true
});

// Create index for efficient queries
importLogSchema.index({ timestamp: -1 });
importLogSchema.index({ status: 1, timestamp: -1 });

module.exports = mongoose.model('ImportLog', importLogSchema);

