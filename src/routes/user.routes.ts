import { Router } from 'express';
import { userController } from '../controllers/user.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';

const router = Router();

// Staff/Manager/Admin quét QR driver để tra thông tin xe trước check-in
router.get('/by-qr/:token', authenticate, authorize(['ADMIN', 'MANAGER', 'STAFF']), (req, res, next) => userController.getByQrToken(req, res, next));

export default router;
