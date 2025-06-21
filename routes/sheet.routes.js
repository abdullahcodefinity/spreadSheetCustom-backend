import express from 'express';
import * as controller from '../controllers/sheet.controller.js';
import { authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// Apply authorization middleware to all routes
router.use(authorize);

// Sheet CRUD
router.post('/', controller.createSheet);
router.get('/', controller.getSheets);
router.get('/:id', controller.getSheet);
router.put('/:id', controller.updateSheet);
router.put('/:id/columns', controller.updateSheetColumns);
router.delete('/:id', controller.deleteSheet);

export default router;