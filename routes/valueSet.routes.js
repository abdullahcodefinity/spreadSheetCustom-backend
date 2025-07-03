import express from 'express';
import * as controller from '../controllers/valueSet.controller.js';
import { authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// Apply authorization middleware to all routes
router.use(authorize);

// ValueSet CRUD
router.post('/', controller.createValueSet);
router.get('/', controller.getValueSets);
router.get('/:id', controller.getValueSet);
router.put('/:id', controller.updateValueSet);
router.delete('/:id', controller.deleteValueSet);

export default router;
