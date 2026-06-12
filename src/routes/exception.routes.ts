import { Router } from 'express';
import { exceptionController } from '../controllers/exception.controller';

const router = Router();

router.post('/lost-ticket', exceptionController.handleLostTicket);
router.post('/wrong-plate', exceptionController.handleWrongPlate);
router.post('/wrong-zone', exceptionController.handleWrongZone);
router.get('/', exceptionController.getAllExceptions);

export default router;