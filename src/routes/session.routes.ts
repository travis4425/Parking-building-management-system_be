import { Router } from 'express';
import { sessionController } from '../controllers/session.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', authenticate, authorize(['ADMIN', 'MANAGER', 'STAFF']), sessionController.getAll);
router.get('/:id', authenticate, authorize(['ADMIN', 'MANAGER', 'STAFF']), sessionController.getById);
router.post('/', authenticate, authorize(['ADMIN', 'MANAGER', 'STAFF']), sessionController.checkIn);
router.post('/checkout', authenticate, authorize(['ADMIN', 'MANAGER', 'STAFF']), sessionController.checkOut);

export default router;
