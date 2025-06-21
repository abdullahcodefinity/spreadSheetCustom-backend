import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import sheetRoutes from './routes/sheet.routes.js';
import sheetDataRoutes from './routes/sheetData.routes.js';
import authRoutes from './routes/auth.routes.js';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/sheets', sheetRoutes);
app.use('/api/sheet-data', sheetDataRoutes);
app.use('/api/auth', authRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});