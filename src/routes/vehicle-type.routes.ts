import { Router } from 'express';
import { vehicleTypeController } from '../controllers/vehicle-type.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';

const router = Router();

// ─── VEHICLE TYPES ────────────────────────────────────────────────────────────
router.get('/vehicle-types', authenticate, vehicleTypeController.getAll);
router.post('/vehicle-types', authenticate, authorize('ADMIN', 'MANAGER'), vehicleTypeController.create);
router.get('/vehicle-types/:id', authenticate, vehicleTypeController.getById);
router.patch('/vehicle-types/:id', authenticate, authorize('ADMIN', 'MANAGER'), vehicleTypeController.update);
router.delete('/vehicle-types/:id', authenticate, authorize('ADMIN', 'MANAGER'), vehicleTypeController.delete);

// ─── ZONE VEHICLE RULES ──────────────────────────────────────────────────────
router.get('/zone-vehicle-rules', authenticate, vehicleTypeController.getZoneVehicleRules);
router.post('/zone-vehicle-rules', authenticate, authorize('ADMIN', 'MANAGER'), vehicleTypeController.createZoneVehicleRule);
router.delete('/zone-vehicle-rules', authenticate, authorize('ADMIN', 'MANAGER'), vehicleTypeController.deleteZoneVehicleRule);

export default router;
