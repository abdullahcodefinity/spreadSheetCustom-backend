import 'dotenv/config';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { uploadFileToAws } from '../../aws/awsService.js';
import { backupConfig } from './config.js';

// Get the directory name of the current module
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Create backup directory if it doesn't exist
if (!fs.existsSync(backupConfig.backup.directory)) {
  fs.mkdirSync(backupConfig.backup.directory, { recursive: true });
}

/**
 * Create a PostgreSQL database backup in custom dump format
 * @returns {Promise<string>} Path to the created backup file
 */
async function createDatabaseBackup() {
  return new Promise((resolve, reject) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `${backupConfig.database.name}_${timestamp}.dump`;
    const backupFilePath = path.join(backupConfig.backup.directory, backupFileName);
    
    // Build the pg_dump command with custom format (-Fc)
    const pgDumpCmd = [
      'PGPASSWORD="' + backupConfig.database.password + '"',
      'pg_dump',
      `-h ${backupConfig.database.host}`,
      `-p ${backupConfig.database.port}`,
      `-U ${backupConfig.database.user}`,
      '--format=custom',
      '--no-owner',
      '--no-privileges',
      '--schema=public',
      `-f "${backupFilePath}"`, // Output file
      backupConfig.database.name
    ].join(' ');

    console.log(`Creating database backup: ${backupFileName}`);
    
    exec(pgDumpCmd, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error creating database backup: ${error.message}`);
        return reject(error);
      }
      if (stderr) {
        console.warn(`pg_dump warnings: ${stderr}`);
      }
      
      console.log(`Database backup created successfully: ${backupFilePath}`);
      resolve(backupFilePath);
    });
  });
}

/**
 * Upload backup file to S3
 * @param {string} backupFilePath - Path to the backup file
 * @returns {Promise<string>} S3 URL of the uploaded file
 */
async function uploadBackupToS3(backupFilePath) {
  try {
    const fileName = path.basename(backupFilePath);
    const s3Key = `${backupConfig.s3.folder}/${fileName}`;
    
    console.log(`Uploading backup to S3: ${s3Key}`);
    const s3Url = await uploadFileToAws(s3Key, backupFilePath);
    
    console.log(`Backup uploaded successfully to S3: ${s3Url}`);
    return s3Url;
  } catch (error) {
    console.error(`Error uploading backup to S3: ${error.message}`);
    throw error;
  }
}

/**
 * Main backup function
 */
async function runBackup() {
  try {
    // Create database backup
    const backupFilePath = await createDatabaseBackup();
    
    // Upload backup to S3 if enabled
    if (backupConfig.s3.enabled) {
      await uploadBackupToS3(backupFilePath);
    }
    
    console.log('Database backup and upload completed successfully');
    
    // Clean up old local backups
    cleanupOldBackups();
  } catch (error) {
    console.error(`Backup process failed: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Clean up old backup files based on retention policy
 */
function cleanupOldBackups() {
  try {
    const files = fs.readdirSync(backupConfig.backup.directory);
    const now = new Date();
    
    files.forEach(file => {
      const filePath = path.join(backupConfig.backup.directory, file);
      const stats = fs.statSync(filePath);
      const fileAge = (now - stats.mtime) / (1000 * 60 * 60 * 24); // age in days
      
      if (fileAge > backupConfig.backup.retentionDays) {
        fs.unlinkSync(filePath);
        console.log(`Deleted old backup: ${file}`);
      }
    });
  } catch (error) {
    console.error(`Error cleaning up old backups: ${error.message}`);
  }
}

// Run the backup if this file is executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runBackup();
}

export { runBackup }; 