import { Router } from 'express';
import { sessionController } from '../controllers/session.controller';

const router = Router();

router.post('/', sessionController.checkIn);
router.post('/checkout', sessionController.checkOut);

export default router;