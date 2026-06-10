import { Router } from 'express';
import { login, register, logout, changePassword } from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth.middleware'; // Nơi chứa logic kiểm tra Token

const router = Router();

// Các API không cần đăng nhập
router.post('/register', register);
router.post('/login', login);

// Các API bắt buộc phải có Token (authenticate)
router.post('/logout', authenticate, logout);
router.post('/change-password', authenticate, changePassword);

export default router;