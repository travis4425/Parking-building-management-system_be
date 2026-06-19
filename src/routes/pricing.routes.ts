import { Router } from 'express';
import { pricingController } from '../controllers/pricing.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';

const router = Router();

// ─── PRICING POLICIES ────────────────────────────────────────────────────────
router.get('/pricing', authenticate, pricingController.getAll);
router.get('/pricing/active', authenticate, pricingController.getActive);
router.get('/pricing/peak-hours', pricingController.getPeakHours); // public — FE đọc để tính giờ cao điểm
router.post('/pricing/calculate', authenticate, pricingController.calculatePrice); // Keep this before :id
router.post('/pricing', authenticate, authorize(['ADMIN', 'MANAGER']), pricingController.create);
router.get('/pricing/:id', authenticate, pricingController.getById);
router.patch('/pricing/:id', authenticate, authorize(['ADMIN', 'MANAGER']), pricingController.update);
router.delete('/pricing/:id', authenticate, authorize(['ADMIN', 'MANAGER']), pricingController.delete);

export default router;
