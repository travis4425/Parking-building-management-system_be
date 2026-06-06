import { Router } from 'express';
import { reportsController } from '../controllers/reports.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';

const router = Router();

// ─── REPORTS & ANALYTICS ─────────────────────────────────────────────────────
router.get('/reports/revenue', authenticate, authorize('ADMIN', 'MANAGER'), reportsController.getRevenue);
router.get('/reports/traffic', authenticate, authorize('ADMIN', 'MANAGER'), reportsController.getTraffic);
router.get('/reports/occupancy', authenticate, authorize('ADMIN', 'MANAGER'), reportsController.getOccupancy);
router.get('/reports/vehicle-types', authenticate, authorize('ADMIN', 'MANAGER'), reportsController.getVehicleTypeDistribution);
router.get('/reports/peak-hours', authenticate, authorize('ADMIN', 'MANAGER'), reportsController.getPeakHours);

export default router;
