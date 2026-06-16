import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { zoneController } from '../controllers/zone.controller';
import { gateController } from '../controllers/gate.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';

const router = Router();

// 1. Route ĐẶC BIỆT (phải đứng đầu tiên để tránh xung đột)
router.get('/dev/token', (_req, res) => {
  const token = jwt.sign(
    { id: 'dev-user-id', email: 'dev@test.com', role: 'MANAGER' }, 
    process.env.JWT_SECRET || 'test_secret', 
    { expiresIn: '365d' }
  );
  res.json({ success: true, token });
});

// 2. Các Route cố định (không có tham số :id)
router.get('/zones/summary', authenticate, zoneController.getSummary);
router.get('/gates/available', authenticate, gateController.getAvailable);

router.get('/zones', authenticate, zoneController.getAll);
router.post('/zones', authenticate, authorize(['ADMIN', 'MANAGER']), zoneController.create);

router.get('/gates', authenticate, gateController.getAll);
router.post('/gates', authenticate, authorize(['ADMIN', 'MANAGER']), gateController.create);

// 3. CÁC ROUTE CÓ THAM SỐ :id (Luôn đứng cuối cùng)
router.get('/zones/:id', authenticate, zoneController.getById);
router.patch('/zones/:id', authenticate, authorize(['ADMIN', 'MANAGER']), zoneController.update);

router.get('/gates/:id', authenticate, gateController.getById);
router.patch('/gates/:id', authenticate, authorize(['ADMIN', 'MANAGER']), gateController.update);

export default router;