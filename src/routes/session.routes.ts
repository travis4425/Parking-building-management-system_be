import { Router } from 'express';
import { sessionController } from '../controllers/session.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', authenticate, sessionController.getAll);
rou