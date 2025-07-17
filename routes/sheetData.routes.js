import express from 'express';
import * as controller from '../controllers/sheetData.controller.js';
import { authorize } from '../middleware/auth.middleware.js';
import { fileUploadMiddleware, uploadFileAndSaveUrl,removeFileFromCell } from '../aws/fileUpload.controller.js';

const router = express.Router();

// Apply authorization middleware to all routes
router.use(authorize);


// Row CRUD
router.post('/', controller.createSheetRow);
router.get('/:spreadsheetId', controller.getSheetRows);
router.put('/:spreadsheetId/position/:position', controller.updateSheetRowByPosition);
router.put('/:spreadsheetId/move', controller.moveSheetRow);
router.delete('/:sheetId/position/:position', controller.deleteSheetRow);
// Add this route for file upload to a specific cell in a row
router.post('/:spreadsheetId/row/upload', fileUploadMiddleware, uploadFileAndSaveUrl);
router.post("/:spreadsheetId/remove-file", removeFileFromCell);



export default router;