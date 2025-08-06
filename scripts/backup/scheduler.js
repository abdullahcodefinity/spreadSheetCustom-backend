import 'dotenv/config';
import { runBackup } from './dbBackup.js';
import { scheduleJob } from 'node-schedule';
import { backupConfig } from './config.js';

/**
 * Schedule database backups to run at a specific time daily
 */
function scheduleBackups() {
  // Get the cron time from config
  const backupTime = backupConfig.scheduler.cronTime;
  const timezone = backupConfig.scheduler.timezone;
  
  console.log(`Scheduling database backups to run at: ${backupTime} (${timezone})`);
  
  // Schedule the job
  const job = scheduleJob({ rule: backupTime, tz: timezone }, async () => {
    console.log(`Running scheduled backup at ${new Date().toISOString()}`);
    try {
      await runBackup();
      console.log('Scheduled backup completed successfully');
    } catch (error) {
      console.error(`Scheduled backup failed: ${error.message}`);
    }
  });
  
  return job;
}

// Start the scheduler if this file is executed directly
if (import.meta.url === process.argv[1]) {
  const job = scheduleBackups();
  
  // Keep the process running
  console.log('Backup scheduler is running. Press Ctrl+C to exit.');
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('Shutting down backup scheduler...');
    job.cancel();
    process.exit(0);
  });
}

export { scheduleBackups }; 