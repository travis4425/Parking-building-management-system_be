import { Router } from 'express';
import { exceptionController } from '../controllers/exception.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';

const router = Router();

router.post('/lost-ticket', authenticate, authorize(['ADMIN', 'MANAGER', 'STAFF']), exceptionController.handleLostTicket);
router.post('/wrong-plate', authenticate, authorize(['ADMIN', 'MANAGER', 'STAFF']), exceptionController.handleWrongPlate);
router.post('/wrong-zone', authenticate, authorize(['ADMIN', 'MANAGER', 'STAFF']), exceptionController.handleWrongZone);
router.get('/', authenticate, authorize(['ADMIN', 'MANAGER', 'STAFF']), exceptionController.getAllExceptions);

export default router;
