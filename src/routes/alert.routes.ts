import { Router } from 'express';
import { alertController } from '../controllers/alert.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', authenticate, alertController.getAll);
router.get('/:id', authenticate, alertController.getById);
router.post('/', authenticate, authorize(['ADMIN', 'MANAGER', 'STAFF']), alertController.create); // thường do IoT/hệ thống tự tạo, vẫn yêu cầu auth cho route thủ công
router.patch('/:id/resolve', authenticate, authorize(['ADMIN', 'MANAGER', 'STAFF']), alertController.resolve);
router.delete('/:id', authenticate, authorize(['ADMIN', 'MANAGER']), alertController.delete);

export default router;
