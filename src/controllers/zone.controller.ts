import { Request, Response, NextFunction } from 'express';
import { zoneService } from '../services/zone.service';
import { createZoneSchema, updateZoneSchema } from '../validators/zone.validator';
import { AppError } from '../middlewares/error.middleware';

export const zoneController = {
  /**
   * GET /api/zones
   * Danh sách khu vực/tầng
   */
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const { status, floor, page, limit } = req.query;

      const result = await zoneService.getAll({
        status: status as string,
        floor: floor ? Number(floor) : undefined,
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 20,
      });

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/zones/summary
   * Tổng quan sức chứa các tầng (dùng cho dashboard)
   */
  async getSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await zoneService.getSummary();
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/zones/:id
   * Chi tiết một khu vực
   */
  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const data = await zoneService.getById(id);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/zones
   * Tạo khu vực mới
   */
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { error, value } = createZoneSchema.validate(req.body, {
        abortEarly: false,
      });
      if (error) {
        const messages = error.details.map((d) => d.message);
        throw new AppError(messages.join('; '), 422);
      }

      const actorId = (req as any).user?.id ?? 'system';
      const data = await zoneService.create(value, actorId);

      res.status(201).json({
        success: true,
        message: 'Tạo khu vực thành công',
        data,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * PATCH /api/zones/:id
   * Cập nhật thông tin khu vực
   */
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const { error, value } = updateZoneSchema.validate(req.body, {
        abortEarly: false,
      });
      if (error) {
        const messages = error.details.map((d) => d.message);
        throw new AppError(messages.join('; '), 422);
      }

      const actorId = (req as any).user?.id ?? 'system';
      const data = await zoneService.update(id, value, actorId);

      res.json({
        success: true,
        message: 'Cập nhật khu vực thành công',
        data,
      });
    } catch (error) {
      next(error);
    }
  },
};
