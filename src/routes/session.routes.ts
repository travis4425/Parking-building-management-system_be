import { Router } from 'express';
import { sessionController } from '../controllers/session.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', authenticate, sessionController.getAll);
router.get('/:id', authenticate, sessionController.getById);
router.post('/', sessionController.checkIn);
router.post('/checkout', sessionController.checkOut);

export default router;
