import { Router } from 'express';
import { getDevices, updateDeviceStatus } from '../controllers/iot.controller';
import { authenticate } from '../middlewares/auth.middleware';

// ⚠️ BUG ĐÃ SỬA: file này trước đây bị dán nhầm nội dung của error.middleware.ts
// và dòng cuối làm `import router from './slot.routes'; export default router;`
// — nghĩa là `/api/iot` thực chất đang bị app.ts mount NHẦM router của slot
// (lộ lại toàn bộ /api/slots/* dưới tiền tố /api/iot), còn route IoT thật
// (getDevices/updateDeviceStatus) thì không được gắn vào đâu cả, không gọi được.
//
// ⚠️ DEPRECATED: Theo quyết định mới của nhóm, hệ thống KHÔNG dùng IoT/sensor phần cứng
// (không có kinh phí) — chỉ thống kê số chỗ trống theo zone (xem GET /api/zones/summary).
// Giữ lại route này (đã sửa đúng) để không phá vỡ nơi khác có thể còn tham chiếu
// (ví dụ swagger.json), nhưng KHÔNG dùng cho luồng nghiệp vụ mới.
const router = Router();

router.get('/devices', authenticate, getDevices);
router.patch('/devices/:id/status', authenticate, updateDeviceStatus);

export default router;