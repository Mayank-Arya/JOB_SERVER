/**
 * Helper utilities for cron scheduling
 * 
 * Common cron patterns:
 * - Every minute: * * * * *
 * - Every hour: 0 * * * *
 * - Every day at midnight: 0 0 * * *
 * - Every day at 6 AM: 0 6 * * *
 * - Every Monday at 9 AM: 0 9 * * 1
 * - Every 15 minutes: *\/15 * * * *
 * - Every 30 minutes: *\/30 * * * *
 * - Twice a day (6 AM & 6 PM): 0 6,18 * * *
 */

const cronPatterns = {
  EVERY_MINUTE: '* * * * *',
  EVERY_5_MINUTES: '*/5 * * * *',
  EVERY_15_MINUTES: '*/15 * * * *',
  EVERY_30_MINUTES: '*/30 * * * *',
  EVERY_HOUR: '0 * * * *',
  EVERY_2_HOURS: '0 */2 * * *',
  EVERY_6_HOURS: '0 */6 * * *',
  EVERY_12_HOURS: '0 */12 * * *',
  DAILY_MIDNIGHT: '0 0 * * *',
  DAILY_6AM: '0 6 * * *',
  DAILY_NOON: '0 12 * * *',
  WEEKLY_MONDAY_9AM: '0 9 * * 1',
  WEEKLY_SUNDAY_MIDNIGHT: '0 0 * * 0'
};

/**
 * Validate cron expression
 * @param {string} expression - Cron expression to validate
 * @returns {boolean} True if valid
 */
const isValidCronExpression = (expression) => {
  // Basic validation for cron expression format
  const cronRegex = /^(\*|([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])|\*\/([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])) (\*|([0-9]|1[0-9]|2[0-3])|\*\/([0-9]|1[0-9]|2[0-3])) (\*|([1-9]|1[0-9]|2[0-9]|3[0-1])|\*\/([1-9]|1[0-9]|2[0-9]|3[0-1])) (\*|([1-9]|1[0-2])|\*\/([1-9]|1[0-2])) (\*|([0-6])|\*\/([0-6]))$/;
  
  return cronRegex.test(expression);
};

/**
 * Get human-readable description of cron schedule
 * @param {string} expression - Cron expression
 * @returns {string} Human-readable description
 */
const describeCronSchedule = (expression) => {
  const descriptions = {
    '* * * * *': 'Every minute',
    '*/5 * * * *': 'Every 5 minutes',
    '*/15 * * * *': 'Every 15 minutes',
    '*/30 * * * *': 'Every 30 minutes',
    '0 * * * *': 'Every hour',
    '0 */2 * * *': 'Every 2 hours',
    '0 */6 * * *': 'Every 6 hours',
    '0 */12 * * *': 'Every 12 hours',
    '0 0 * * *': 'Daily at midnight',
    '0 6 * * *': 'Daily at 6:00 AM',
    '0 12 * * *': 'Daily at noon',
    '0 9 * * 1': 'Every Monday at 9:00 AM',
    '0 0 * * 0': 'Every Sunday at midnight'
  };

  return descriptions[expression] || 'Custom schedule';
};

module.exports = {
  cronPatterns,
  isValidCronExpression,
  describeCronSchedule
};

