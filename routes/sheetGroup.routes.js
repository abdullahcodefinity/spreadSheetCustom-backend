import express from 'express';
import sheetGroupController from '../controllers/sheetGroup.controller.js';
import { authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// Apply authorization middleware to all routes
router.use(authorize);

// SheetGroup CRUD routes
router.post('/', sheetGroupController.createSheetGroup);
router.get('/',  sheetGroupController.getSheetGroups);
router.get('/:id', sheetGroupController.getSheetGroup);
router.put('/:id', sheetGroupController.updateSheetGroup);
router.delete('/:id', sheetGroupController.deleteSheetGroup);

export default router;
