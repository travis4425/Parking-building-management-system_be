import { Router, Request, Response } from 'express';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// API: Lấy trạng thái thiết bị (Cần Token)
// Route thực tế sẽ là: GET /api/iot/status
router.get('/status', authenticate, (req: Request, res: Response) => {
  try {
    // Trả về dữ liệu giả lập (Mock data) cho hệ thống IoT
    res.status(200).json({
      success: true,
      message: 'Lấy trạng thái thiết bị IoT thành công',
      data: {
        devices: [
          { id: 'SENSOR_01', type: 'CAMERA', location: 'Gate A', status: 'ONLINE', battery: '98%' },
          { id: 'SENSOR_02', type: 'BARRIER', location: 'Gate B', status: 'OFFLINE', battery: '15%' },
          { id: 'SENSOR_03', type: 'SLOT_SENSOR', location: 'Zone A - Slot 05', status: 'ONLINE', battery: '100%' }
        ],
        lastUpdated: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ' });
  }
});

export default router;