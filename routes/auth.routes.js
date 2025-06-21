import express from 'express';
import * as controller from '../controllers/auth.controller.js';
import { authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/signup', controller.signup);
router.post('/login', controller.login);
router.post('/create-user', authorize, controller.createUserByAdmin);
router.get('/users', authorize, controller.getAllUsers);
router.get('/users/:id', authorize, controller.getSingleUser);
router.put('/users/:id', authorize, controller.updateUser);
router.delete('/users/:id', authorize, controller.deleteUser);

export default router;
