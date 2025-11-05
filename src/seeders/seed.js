require('dotenv').config();
const mongoose = require('mongoose');
const Job = require('../models/Job.model');
const ImportLog = require('../models/ImportLog.model');
const logger = require('../config/logger');

// Sample data arrays
const companies = [
  'Google', 'Microsoft', 'Amazon', 'Apple', 'Meta',
  'Netflix', 'Tesla', 'SpaceX', 'Stripe', 'Airbnb',
  'Shopify', 'Spotify', 'Twitter', 'LinkedIn', 'Uber',
  'GitHub', 'Slack', 'Zoom', 'Adobe', 'Salesforce'
];

const jobTitles = [
  'Senior Software Engineer',
  'Full Stack Developer',
  'Backend Engineer',
  'Frontend Developer',
  'DevOps Engineer',
  'Data Scientist',
  'Product Manager',
  'UX Designer',
  'Mobile Developer',
  'Cloud Architect',
  'Machine Learning Engineer',
  'Security Engineer',
  'QA Engineer',
  'Technical Lead',
  'Engineering Manager',
  'Site Reliability Engineer',
  'Database Administrator',
  'Solutions Architect',
  'AI Research Scientist',
  'Blockchain Developer'
];

const categories = [
  'Engineering',
  'Design',
  'Product',
  'Data Science',
  'DevOps',
  'Security',
  'Management',
  'Research',
  'Quality Assurance',
  'Infrastructure'
];

const locations = [
  'Remote',
  'San Francisco, CA',
  'New York, NY',
  'Seattle, WA',
  'Austin, TX',
  'Boston, MA',
  'Los Angeles, CA',
  'Chicago, IL',
  'Denver, CO',
  'Portland, OR',
  'London, UK',
  'Berlin, Germany',
  'Toronto, Canada',
  'Singapore',
  'Sydney, Australia'
];

const jobTypes = ['Full-time', 'Part-time', 'Contract', 'Freelance', 'Remote'];

const descriptions = [
  'We are seeking a talented professional to join our dynamic team. You will work on cutting-edge technologies and collaborate with industry experts.',
  'Join our innovative team and help build products that millions of users love. We offer competitive compensation and great benefits.',
  'Looking for a passionate individual to drive technical excellence and mentor junior team members. Work on challenging problems at scale.',
  'Exciting opportunity to work with modern tech stack and agile methodologies. Shape the future of our platform.',
  'Be part of a fast-growing startup culture. Work directly with founders and make significant impact on product direction.',
  'We are hiring for multiple positions across different teams. Help us build the next generation of cloud infrastructure.',
  'Remote-first company looking for self-motivated individuals. Flexible hours and unlimited PTO.',
  'Join a team of world-class engineers working on distributed systems and microservices architecture.',
  'Opportunity to work with AI/ML technologies and solve complex business problems with data-driven solutions.',
  'Help us revolutionize the industry with innovative products. Work with latest frameworks and tools.'
];

/**
 * Generate random job data
 */
function generateJob(index) {
  const company = companies[Math.floor(Math.random() * companies.length)];
  const title = jobTitles[Math.floor(Math.random() * jobTitles.length)];
  const category = categories[Math.floor(Math.random() * categories.length)];
  const location = locations[Math.floor(Math.random() * locations.length)];
  const type = jobTypes[Math.floor(Math.random() * jobTypes.length)];
  const description = descriptions[Math.floor(Math.random() * descriptions.length)];
  
  // Random date within last 30 days
  const daysAgo = Math.floor(Math.random() * 30);
  const postedAt = new Date();
  postedAt.setDate(postedAt.getDate() - daysAgo);

  return {
    externalId: `seed-job-${index}-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    title,
    company,
    category,
    type,
    location,
    description: `${description}\n\nResponsibilities:\n• Lead technical initiatives\n• Collaborate with cross-functional teams\n• Mentor junior developers\n• Design and implement scalable solutions\n\nRequirements:\n• 5+ years of experience\n• Strong problem-solving skills\n• Excellent communication\n• Bachelor's degree in Computer Science or related field`,
    url: `https://careers.${company.toLowerCase().replace(/\s+/g, '')}.com/jobs/${index}`,
    postedAt,
    updatedAt: new Date()
  };
}

/**
 * Generate random import log data
 */
function generateImportLog(index) {
  const totalFetched = Math.floor(Math.random() * 200) + 50;
  const newJobs = Math.floor(totalFetched * (Math.random() * 0.7 + 0.2)); // 20-90% new
  const updatedJobs = totalFetched - newJobs - Math.floor(Math.random() * 10);
  const failedJobs = Math.floor(Math.random() * 5);
  
  const statuses = ['completed', 'completed', 'completed', 'completed', 'failed'];
  const status = statuses[Math.floor(Math.random() * statuses.length)];
  
  // Random timestamp within last 60 days
  const daysAgo = Math.floor(Math.random() * 60);
  const timestamp = new Date();
  timestamp.setDate(timestamp.getDate() - daysAgo);
  timestamp.setHours(Math.floor(Math.random() * 24));
  timestamp.setMinutes(Math.floor(Math.random() * 60));

  const duration = Math.floor(Math.random() * 120000) + 10000; // 10-130 seconds

  const failedReasons = status === 'failed' 
    ? ['Connection timeout', 'Invalid XML format', 'Server returned 500']
    : [];

  return {
    fileName: `Automated: https://feed${index % 3 + 1}.example.com/jobs.xml`,
    timestamp,
    totalFetched,
    newJobs,
    updatedJobs,
    failedJobs,
    failedReasons,
    duration,
    status
  };
}

/**
 * Seed the database
 */
async function seedDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    logger.info('Connected to MongoDB');
    console.log('🔗 Connected to MongoDB\n');

    // Clear existing data (optional - comment out if you want to keep existing data)
    console.log('🗑️  Clearing existing data...');
    await Job.deleteMany({});
    await ImportLog.deleteMany({});
    logger.info('Cleared existing data');
    console.log('✅ Cleared existing data\n');

    // Generate and insert Jobs
    console.log('📝 Generating 20 jobs...');
    const jobs = [];
    for (let i = 1; i <= 20; i++) {
      jobs.push(generateJob(i));
    }

    const insertedJobs = await Job.insertMany(jobs);
    logger.info(`Inserted ${insertedJobs.length} jobs`);
    console.log(`✅ Inserted ${insertedJobs.length} jobs\n`);

    // Generate and insert Import Logs
    console.log('📝 Generating 20 import logs...');
    const importLogs = [];
    for (let i = 1; i <= 20; i++) {
      importLogs.push(generateImportLog(i));
    }

    const insertedLogs = await ImportLog.insertMany(importLogs);
    logger.info(`Inserted ${insertedLogs.length} import logs`);
    console.log(`✅ Inserted ${insertedLogs.length} import logs\n`);

    // Display summary
    console.log('📊 Summary:');
    console.log(`   Jobs: ${insertedJobs.length}`);
    console.log(`   Import Logs: ${insertedLogs.length}`);
    console.log('\n🎉 Database seeded successfully!\n');

    // Display some sample data
    console.log('Sample Jobs:');
    insertedJobs.slice(0, 3).forEach((job, index) => {
      console.log(`   ${index + 1}. ${job.title} at ${job.company} (${job.type})`);
    });

    console.log('\nSample Import Logs:');
    insertedLogs.slice(0, 3).forEach((log, index) => {
      console.log(`   ${index + 1}. ${log.fileName} - ${log.status} (${log.newJobs} new, ${log.updatedJobs} updated)`);
    });

    console.log('\n✨ You can now start the application!');
    
  } catch (error) {
    logger.error(`Error seeding database: ${error.message}`);
    console.error('❌ Error seeding database:', error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Database connection closed');
    process.exit(0);
  }
}

// Run seeder
console.log('🌱 Starting database seeding...\n');
seedDatabase();

