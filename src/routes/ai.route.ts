import { Router } from 'express';
// Import đúng tên 2 hàm từ file controller bạn vừa gửi
import { suggestSlot, predictPeak, recognizePlate } from '../controllers/ai.controller';
import { authenticate } from '../middlewares/auth.middleware'; // Nêu bạn muốn khóa lại bắt đăng nhập

const router = Router();

// ⚠️ DEPRECATED: Theo quyết định mới của nhóm, hệ thống KHÔNG còn gợi ý slot cụ thể nữa —
// chỉ thống kê số chỗ trống theo zone/tầng (xem GET /api/zones/summary) vì hệ thống
// không có cách xác minh xe có đậu đúng chỗ được gợi ý hay không (chỉ quét bằng điện thoại,
// không có sensor từng slot). FE đã được yêu cầu KHÔNG gọi route này nữa.
// Giữ lại route (không xoá) để tránh phá vỡ nếu nơi khác còn tham chiếu, nhưng không nên dùng cho luồng mới.
// Đường dẫn thực tế: /api/ai/suggest-slot
router.post('/suggest-slot', authenticate, suggestSlot);

// Đường dẫn thực tế sẽ là: /api/ai/predict-peak
router.post('/predict-peak', authenticate, predictPeak);

// Đường dẫn thực tế sẽ là: /api/ai/plate-recognize
router.post('/plate-recognize', authenticate, recognizePlate);

export default router;