import { Router } from 'express';
import { slotController } from '../controllers/slot.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';

const router = Router();

// Routes cố định (không có tham số :id)
router.get('/slots/realtime', slotController.getRealtime);
router.get('/slots', authenticate, slotController.getAll);
router.post('/slots', slotController.create);

// Routes có tham số :id
router.patch(
  '/slots/:id/status',
  authenticate,
  authorize(['ADMIN', 'MANAGER', 'STAFF']),
  slotController.updateStatus
);
router.get('/slots/:id', authenticate, slotController.getById);
router.patch(
  '/slots/:id',
  authenticate,
  authorize(['ADMIN', 'MANAGER']),
  slotController.update
);

export default router;
