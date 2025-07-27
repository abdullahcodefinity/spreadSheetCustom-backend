import express from 'express';
import * as controller from '../controllers/sheet.controller.js';
import { authorize } from '../middleware/auth.middleware.js';
import * as awsService from "../aws/awsService.js"; // Make sure this import is at the top
import sheetGroupController from '../controllers/sheetGroup.controller.js'; // Fix import style if needed

const router = express.Router();

// Apply authorization middleware to all routes
router.use(authorize);

// Sheet CRUD
router.post('/', controller.createSheet);
router.get('/', controller.getSheets);
router.get('/without-group', controller.getSheetsWithoutGroup);
router.get('/:id', controller.getSheet);
router.put('/:id', controller.updateSheet);
router.put('/:id/permissions', controller.updateSheetPermissions);
router.put('/:id/share', controller.shareSheet);
router.put('/:id/columns', controller.updateSheetColumns);
router.put('/:id/columns/move', controller.moveSheetColumn);
router.put('/:id/columns/dropdown', controller.attachDropdown);
router.put('/:id/columns/dropdown/remove', controller.removeDropdown);
router.put('/remove-access/:id', controller.removeUserFromSheet);
router.delete('/:id', controller.deleteSheet);
router.put('/:id/columns/file-type', controller.attachFileType);
router.put('/:id/columns/attach-calendar', controller.attachCalendar);
router.put('/:id/columns/attach-email', controller.attachEmail);


export default router;