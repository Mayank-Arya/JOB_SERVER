const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  externalId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    index: true
  },
  company: {
    type: String,
    required: true
  },
  category: {
    type: String,
    default: 'General'
  },
  type: {
    type: String,
    enum: ['Full-time', 'Part-time', 'Contract', 'Freelance', 'Remote', 'Other'],
    default: 'Other'
  },
  location: {
    type: String,
    default: 'Remote'
  },
  description: {
    type: String,
    required: true
  },
  url: {
    type: String,
    required: true,
    unique: true
  },
  postedAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Create compound index for efficient queries
jobSchema.index({ company: 1, postedAt: -1 });
jobSchema.index({ category: 1, postedAt: -1 });

// Update the updatedAt field before saving
jobSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Job', jobSchema);

