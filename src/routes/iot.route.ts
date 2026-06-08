import { Router } from 'express';
import { getDevices, updateDeviceStatus } from '../controllers/iot.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';

const router = Router();

// Chỉ Quản lý và Admin mới được đụng vào hệ thống IoT
router.use(authenticate, authorize('ADMIN', 'MANAGER'));

router.get('/devices', getDevices);
router.patch('/devices/:id/status', updateDeviceStatus);

export default router;