import { Router } from 'express';
import { login, register, logout, changePassword, refreshToken } from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth.middleware'; // Nơi chứa logic kiểm tra Token

const router = Router();

// =====================================================================
// Các API KHÔNG cần đăng nhập (Public)
// =====================================================================
router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refreshToken); // Cổng cấp cứu khi Access Token hết hạn

// =====================================================================
// Các API BẮT BUỘC phải có Token hợp lệ (Private)
// =====================================================================
router.post('/logout', authenticate, logout);
router.post('/change-password', authenticate, changePassword);

export default router;