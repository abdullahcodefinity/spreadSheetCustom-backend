import express from 'express';
import * as controller from '../controllers/sheetData.controller.js';
import { authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// Apply authorization middleware to all routes
router.use(authorize);


// Row CRUD
router.post('/', controller.createSheetRow);
router.get('/:spreadsheetId', controller.getSheetRows);
router.put('/:spreadsheetId/position/:position', controller.updateSheetRowByPosition);
router.put('/:spreadsheetId/move', controller.moveSheetRow);
router.delete('/:sheetId/position/:position', controller.deleteSheetRow);

export default router;