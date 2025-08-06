import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import sheetRoutes from './routes/sheet.routes.js';
import sheetDataRoutes from './routes/sheetData.routes.js';
import authRoutes from './routes/auth.routes.js';
import valueSetRoutes from './routes/valueSet.routes.js';
import sheetGroupRoutes from './routes/sheetGroup.routes.js';

// Import backup scheduler (optional)
import { scheduleBackups } from './scripts/backup/scheduler.js';

const app = express();


app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

app.use(cors());
app.use(express.json());

app.use('/api/sheets', sheetRoutes);
app.use('/api/sheet-data', sheetDataRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/value-sets', valueSetRoutes);
app.use('/api/sheets-groups', sheetGroupRoutes);


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  
  // Start backup scheduler if enabled
  if (process.env.ENABLE_BACKUP_SCHEDULER === 'true') {
    console.log('Starting database backup scheduler...');
    scheduleBackups();
  }
});



// pg_restore -v -h localhost -p 5432 -U postgres -d postgres --no-owner --no-privileges --schema=public spreadsheet_db_2025-08-06T18-38-07-234Z.dump