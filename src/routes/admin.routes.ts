import { Router } from 'express';
import { adminController } from '../controllers/admin.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';

const router = Router();

// ─── USER MANAGEMENT ─────────────────────────────────────────────────────────
router.get('/admin/users', authenticate, authorize(['ADMIN']), adminController.getAllUsers);
router.post('/admin/users', authenticate, authorize(['ADMIN']), adminController.createUser);
router.get('/admin/users/:id', authenticate, authorize(['ADMIN']), adminController.getUserById);
router.patch('/admin/users/:id', authenticate, authorize(['ADMIN']), adminController.updateUser);
router.patch('/admin/users/:id/role', authenticate, authorize(['ADMIN']), adminController.updateUserRole);
router.patch('/admin/users/:id/status', authenticate, authorize(['ADMIN']), adminController.updateUserStatus);

// ─── AUDIT LOGS ──────────────────────────────────────────────────────────────
router.get('/admin/audit-logs', authenticate, authorize(['ADMIN', 'MANAGER']), adminController.getAuditLogs);

// ─── SYSTEM CONFIG ──────────────────────────────────────────────────────────
router.get('/admin/system-config', authenticate, authorize(['ADMIN', 'MANAGER']), adminController.getSystemConfig);
router.get('/admin/system-config/:key', authenticate, authorize(['ADMIN', 'MANAGER']), adminController.getConfigByKey);
router.post('/admin/system-config', authenticate, authorize(['ADMIN']), adminController.setSystemConfig);
router.patch('/admin/system-config/:key', authenticate, authorize(['ADMIN']), adminController.updateSystemConfig);
router.delete('/admin/system-config/:key', authenticate, authorize(['ADMIN']), adminController.deleteSystemConfig);

export default router;
