import { Request, Response, NextFunction } from 'express';
import { adminService } from '../services/admin.service';
import { createUserSchema, updateUserSchema, updateUserRoleSchema, updateUserStatusSchema, systemConfigSchema } from '../validators/admin.validator';
import { AppError } from '../middlewares/error.middleware';

export const adminController = {
  // ─── USER MANAGEMENT ──────────────────────────────────────────────────────
  /**
   * GET /api/admin/users
   * Danh sách tài khoản (filter role/status)
   */
  async getAllUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const { role, status, page, limit } = req.query;

      const result = await adminService.getAllUsers(
        role as string,
        status as string,
        page ? Number(page) : 1,
        limit ? Number(limit) : 20
      );

      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/admin/users/:id
   */
  async getUserById(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await adminService.getUserById(req.params.id);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/admin/users
   * Tạo tài khoản
   */
  async createUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { error, value } = createUserSchema.validate(req.body);

      if (error) {
        throw new AppError(error.details[0].message, 400);
      }

      const data = await adminService.createUser(value);

      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  /**
   * PATCH /api/admin/users/:id
   * Cập nhật thông tin
   */
  async updateUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { error, value } = updateUserSchema.validate(req.body);

      if (error) {
        throw new AppError(error.details[0].message, 400);
      }

      const data = await adminService.updateUser(req.params.id, value);

      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  /**
   * PATCH /api/admin/users/:id/role
   * Đổi role
   */
  async updateUserRole(req: Request, res: Response, next: NextFunction) {
    try {
      const { error, value } = updateUserRoleSchema.validate(req.body);

      if (error) {
        throw new AppError(error.details[0].message, 400);
      }

      const data = await adminService.updateUserRole(req.params.id, value.role);

      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  /**
   * PATCH /api/admin/users/:id/status
   * Khóa/mở khóa
   */
  async updateUserStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { error, value } = updateUserStatusSchema.validate(req.body);

      if (error) {
        throw new AppError(error.details[0].message, 400);
      }

      const data = await adminService.updateUserStatus(req.params.id, value.status);

      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  // ─── AUDIT LOGS ────────────────────────────────────────────────────────────
  /**
   * GET /api/admin/audit-logs
   * Lịch sử thao tác
   */
  async getAuditLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId, action, resource, startDate, endDate, page, limit } = req.query;

      const result = await adminService.getAuditLogs(
        userId as string,
        action as string,
        resource as string,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined,
        page ? Number(page) : 1,
        limit ? Number(limit) : 20
      );

      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  },

  // ─── SYSTEM CONFIG ───────────────────────────────────────────────────────────
  /**
   * GET /api/admin/system-config
   * Cấu hình hệ thống
   */
  async getSystemConfig(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await adminService.getSystemConfig();
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/admin/system-config/:key
   */
  async getConfigByKey(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await adminService.getConfigByKey(req.params.key);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/admin/system-config
   */
  async setSystemConfig(req: Request, res: Response, next: NextFunction) {
    try {
      const { error, value } = systemConfigSchema.validate(req.body);

      if (error) {
        throw new AppError(error.details[0].message, 400);
      }

      const data = await adminService.setSystemConfig(value.key, value.value, value.description, value.type);

      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  /**
   * PATCH /api/admin/system-config/:key
   * Cập nhật config
   */
  async updateSystemConfig(req: Request, res: Response, next: NextFunction) {
    try {
      const { key } = req.params;
      const updateData = req.body;

      const data = await adminService.updateSystemConfig(key, updateData);

      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  /**
   * DELETE /api/admin/system-config/:key
   */
  async deleteSystemConfig(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await adminService.deleteSystemConfig(req.params.key);

      res.json({ success: true, data, message: 'System config deleted' });
    } catch (error) {
      next(error);
    }
  },
};
