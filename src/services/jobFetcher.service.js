const axios = require('axios');
const { XMLParser } = require('fast-xml-parser');
const logger = require('../config/logger');

class JobFetcherService {
  constructor() {
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      textNodeName: '#text',
      parseAttributeValue: true,
      parseTagValue: true
    });
  }

  async fetchFromURL(url) {
    try {
      logger.info(`Fetching jobs from: ${url}`);
      
      const response = await axios.get(url, {
        timeout: 30000,
        headers: {
          'User-Agent': 'Job-Importer-Bot/1.0'
        }
      });

      if (!response.data) {
        throw new Error('No data received from XML feed');
      }

      const parsedData = this.parser.parse(response.data);
      logger.info(`Successfully fetched and parsed data from: ${url}`);
      
      return {
        url,
        data: parsedData,
        success: true
      };
    } catch (error) {
      logger.error(`Error fetching from ${url}: ${error.message}`);
      return {
        url,
        data: null,
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Extract jobs from parsed XML data
   * @param {Object} parsedData - Parsed XML data
   * @param {string} sourceUrl - Source URL for reference
   * @returns {Array} Array of normalized job objects
   */
  extractJobs(parsedData, sourceUrl) {
    try {
      let jobs = [];

      // Try common XML structures
      if (parsedData.rss && parsedData.rss.channel && parsedData.rss.channel.item) {
        jobs = Array.isArray(parsedData.rss.channel.item) 
          ? parsedData.rss.channel.item 
          : [parsedData.rss.channel.item];
      } else if (parsedData.feed && parsedData.feed.entry) {
        jobs = Array.isArray(parsedData.feed.entry) 
          ? parsedData.feed.entry 
          : [parsedData.feed.entry];
      } else if (parsedData.jobs && parsedData.jobs.job) {
        jobs = Array.isArray(parsedData.jobs.job) 
          ? parsedData.jobs.job 
          : [parsedData.jobs.job];
      } else if (parsedData.job) {
        jobs = Array.isArray(parsedData.job) 
          ? parsedData.job 
          : [parsedData.job];
      } else if (Array.isArray(parsedData)) {
        jobs = parsedData;
      }

      logger.info(`Extracted ${jobs.length} jobs from ${sourceUrl}`);
      return jobs.map(job => this.normalizeJob(job, sourceUrl));
    } catch (error) {
      logger.error(`Error extracting jobs from ${sourceUrl}: ${error.message}`);
      return [];
    }
  }

  /**
   * Normalize job data to standard format
   * @param {Object} job - Raw job data
   * @param {string} sourceUrl - Source URL
   * @returns {Object} Normalized job object
   */
  normalizeJob(job, sourceUrl) {
    // Try different field mappings
    const title = job.title || job.jobTitle || job.position || job['#text'] || 'Untitled Position';
    const company = job.company || job.companyName || job.employer || job.organization || 'Unknown Company';
    const description = job.description || job.summary || job.content || job['content:encoded'] || '';
    const url = job.link || job.url || job.apply_url || job.guid || sourceUrl;
    const location = job.location || job.jobLocation || job.city || job.country || 'Remote';
    const category = job.category || job.jobCategory || job.department || job.sector || 'General';
    const type = job.type || job.jobType || job.employmentType || 'Other';
    
    // Generate unique external ID
    const externalId = job.id || job.guid || job['@_id'] || 
      `${sourceUrl}-${title}-${company}`.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();

    // Parse date
    let postedAt = new Date();
    if (job.pubDate || job.published || job.date || job.postedDate) {
      const dateStr = job.pubDate || job.published || job.date || job.postedDate;
      const parsedDate = new Date(dateStr);
      if (!isNaN(parsedDate.getTime())) {
        postedAt = parsedDate;
      }
    }

    return {
      externalId: externalId.substring(0, 200), // Limit length
      title: String(title).substring(0, 200),
      company: String(company).substring(0, 200),
      category: String(category).substring(0, 100),
      type: this.normalizeJobType(String(type)),
      location: String(location).substring(0, 200),
      description: String(description).substring(0, 5000), // Limit description length
      url: String(url).substring(0, 500),
      postedAt,
      updatedAt: new Date()
    };
  }

  /**
   * Normalize job type to match enum values
   * @param {string} type - Raw job type
   * @returns {string} Normalized job type
   */
  normalizeJobType(type) {
    const typeMap = {
      'full-time': 'Full-time',
      'fulltime': 'Full-time',
      'full time': 'Full-time',
      'part-time': 'Part-time',
      'parttime': 'Part-time',
      'part time': 'Part-time',
      'contract': 'Contract',
      'contractor': 'Contract',
      'freelance': 'Freelance',
      'remote': 'Remote',
      'temporary': 'Contract'
    };

    const normalized = type.toLowerCase().trim();
    return typeMap[normalized] || 'Other';
  }

  /**
   * Fetch jobs from multiple URLs
   * @param {Array<string>} urls - Array of XML feed URLs
   * @returns {Promise<Array>} Array of all extracted jobs
   */
  async fetchFromMultipleURLs(urls) {
    const results = await Promise.all(
      urls.map(url => this.fetchFromURL(url))
    );

    const allJobs = [];
    const errors = [];

    results.forEach(result => {
      if (result.success && result.data) {
        const jobs = this.extractJobs(result.data, result.url);
        allJobs.push(...jobs);
      } else {
        errors.push({ url: result.url, error: result.error });
      }
    });

    logger.info(`Total jobs fetched from all sources: ${allJobs.length}`);
    
    if (errors.length > 0) {
      logger.warn(`Failed to fetch from ${errors.length} sources:`, errors);
    }

    return {
      jobs: allJobs,
      errors
    };
  }
}

module.exports = new JobFetcherService();

