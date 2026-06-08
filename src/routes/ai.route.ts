import { Router } from 'express';
import { suggestSlot, predictPeak } from '../controllers/ai.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';

const router = Router();

// Gợi ý slot thường gọi ngay tại cổng khi xe tới (Nên bảo vệ bằng authenticate)
router.post('/suggest-slot', authenticate, suggestSlot);

// Tính năng dự báo chỉ dành cho quản lý và nhân viên
router.post('/predict-peak', authenticate, authorize('ADMIN', 'MANAGER', 'STAFF'), predictPeak);

export default router;