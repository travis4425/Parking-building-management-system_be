import { Router } from 'express';
import { reservationController } from '../controllers/reservation.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';

const router = Router();

// ─── RESERVATIONS ────────────────────────────────────────────────────────────
router.get('/reservations', authenticate, reservationController.getAll);
router.get('/reservations/active', authenticate, reservationController.getActive); // Keep before /user/:userId
router.get('/reservations/user/:userId', authenticate, reservationController.getByUserId);
router.post('/reservations', authenticate, reservationController.create);
router.get('/reservations/:id', authenticate, reservationController.getById);
router.patch('/reservations/:id/cancel', authenticate, reservationController.cancel);

export default router;
