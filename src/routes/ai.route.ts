import { Router } from 'express';
// Import đúng tên 2 hàm từ file controller bạn vừa gửi
import { suggestSlot, predictPeak, recognizePlate } from '../controllers/ai.controller';
import { authenticate } from '../middlewares/auth.middleware'; // Nêu bạn muốn khóa lại bắt đăng nhập

const router = Router();

// Đường dẫn thực tế sẽ là: /api/ai/suggest-slot
router.post('/suggest-slot', authenticate, suggestSlot);

// Đường dẫn thực tế sẽ là: /api/ai/predict-peak
router.post('/predict-peak', authenticate, predictPeak);

// Đường dẫn thực tế sẽ là: /api/ai/plate-recognize
router.post('/plate-recognize', authenticate, recognizePlate);

export default router;