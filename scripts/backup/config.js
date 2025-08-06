import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name of the current module
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Backup configuration settings
 */
export const backupConfig = {
  // Database connection settings
  database: {
    name: process.env.DATABASE_NAME || 'spreadsheet_db',
    user: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD,
    host: process.env.DATABASE_HOST || 'localhost',
    port: process.env.DATABASE_PORT || '5432',
  },
  
  // Backup file settings
  backup: {
    directory: path.join(__dirname, '../../backups'),
    retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS || '7', 10),
  },
  
  // S3 storage settings
  s3: {
    enabled: process.env.S3_BACKUP_ENABLED !== 'false',
    folder: process.env.S3_BACKUP_FOLDER || 'dbBackup',
  },
  
  // Scheduler settings
  scheduler: {
    cronTime: process.env.BACKUP_TIME || '0 2 * * *', // Default: 2:00 AM daily
    timezone: process.env.BACKUP_TIMEZONE || 'UTC',
  }
}; 