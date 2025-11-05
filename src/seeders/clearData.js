require('dotenv').config();
const mongoose = require('mongoose');
const Job = require('../models/Job.model');
const ImportLog = require('../models/ImportLog.model');
const logger = require('../config/logger');

/**
 * Clear all data from the database
 */
async function clearDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('🔗 Connected to MongoDB\n');

    // Get counts before deletion
    const jobCount = await Job.countDocuments();
    const logCount = await ImportLog.countDocuments();

    console.log('Current data:');
    console.log(`   Jobs: ${jobCount}`);
    console.log(`   Import Logs: ${logCount}\n`);

    if (jobCount === 0 && logCount === 0) {
      console.log('✅ Database is already empty!\n');
      return;
    }

    // Confirm deletion
    console.log('⚠️  WARNING: This will delete all data!\n');
    
    // Delete all data
    console.log('🗑️  Deleting all data...');
    await Job.deleteMany({});
    await ImportLog.deleteMany({});
    
    logger.info('Cleared all data from database');
    console.log('✅ All data cleared successfully!\n');

    console.log('📊 Summary:');
    console.log(`   Jobs deleted: ${jobCount}`);
    console.log(`   Import Logs deleted: ${logCount}\n`);
    
  } catch (error) {
    logger.error(`Error clearing database: ${error.message}`);
    console.error('❌ Error clearing database:', error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('👋 Database connection closed');
    process.exit(0);
  }
}

// Run clear
console.log('🧹 Starting database cleanup...\n');
clearDatabase();

