import { Router } from 'express';
import { login, logout, getMe } from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// Route công khai
router.post('/login', login);

// Route yêu cầu xác thực
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getMe);

export default router;