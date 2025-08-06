import 'dotenv/config';
import { runBackup } from './dbBackup.js';

/**
 * Test the database backup and S3 upload process
 */
async function testBackup() {
  console.log('Starting backup test...');
  
  try {
    console.time('Backup completed in');
    await runBackup();
    console.timeEnd('Backup completed in');
    
    console.log('✅ Backup test completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Backup test failed:', error);
    process.exit(1);
  }
}

// Run the test
testBackup(); 