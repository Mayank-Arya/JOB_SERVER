/**
 * PM2 Configuration for Production Deployment
 * 
 * Start with: pm2 start pm2.config.js
 * Monitor: pm2 monit
 * Logs: pm2 logs
 * Stop: pm2 stop all
 * Restart: pm2 restart all
 */

module.exports = {
  apps: [
    {
      name: 'job-importer-api',
      script: './src/app.js',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      error_file: './logs/pm2-api-error.log',
      out_file: './logs/pm2-api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000
    },
    {
      name: 'job-importer-worker',
      script: './src/queues/worker.js',
      instances: 2, // Run 2 worker instances
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        WORKER_CONCURRENCY: 5
      },
      error_file: './logs/pm2-worker-error.log',
      out_file: './logs/pm2-worker-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000
    }
  ]
};

