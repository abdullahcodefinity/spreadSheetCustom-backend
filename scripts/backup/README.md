# Database Backup System

This system automatically backs up the PostgreSQL database and uploads the backup files to an S3 bucket.

## Features

- Daily automated PostgreSQL database backups
- S3 bucket storage for backup files
- Configurable backup schedule (cron format)
- Automatic cleanup of old backup files
- Timezone support
- Database restore functionality

## Setup

1. Install the required dependencies:
   ```bash
   npm install
   ```

2. Configure your environment variables by adding the following to your `.env` file:

   ```
   # Database connection settings
   DATABASE_NAME=spreadsheet_db
   DATABASE_USER=postgres
   DATABASE_PASSWORD=your_password_here
   DATABASE_HOST=localhost
   DATABASE_PORT=5432

   # Backup settings
   BACKUP_RETENTION_DAYS=7
   BACKUP_TIME=0 2 * * *  # Run at 2:00 AM every day (cron format)
   BACKUP_TIMEZONE=UTC

   # S3 settings
   S3_BACKUP_ENABLED=true
   S3_BACKUP_FOLDER=dbBackup
   AWS_REGION=us-east-1
   AWS_ACCESSKEYID=your_access_key_here
   AWS_SECRETACCESSKEY=your_secret_key_here
   AWS_BUCKET_NAME=your_bucket_name_here
   CLOUDFRONT_DOMAIN=your_cloudfront_domain_here
   ```

## Usage

### Run a manual backup

```bash
npm run backup
```

### Test the backup process

```bash
npm run backup:test
```

### Start the backup scheduler

```bash
npm run backup:scheduler
```

## Deployment

For production deployment, you can use a process manager like PM2:

```bash
# Install PM2 globally
npm install -g pm2

# Start the backup scheduler with PM2
pm2 start scripts/backup/scheduler.js --name "db-backup-scheduler"

# Ensure it starts on system boot
pm2 startup
pm2 save
```

## Folder Structure

- `dbBackup.js` - Main backup script that creates database backups and uploads to S3
- `scheduler.js` - Scheduler that runs backups at the configured time
- `config.js` - Configuration settings loaded from environment variables
- `test.js` - Test script to verify the backup process

## Troubleshooting

- Ensure ` pg_dump` is installed and accessible in your PATH
- Verify AWS credentials and permissions
- Check that the backup directory is writable 