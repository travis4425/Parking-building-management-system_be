import { Request, Response, NextFunction } from 'express';
import { gateService } from '../services/gate.service';
import { createGateSchema, updateGateSchema } from '../validators/gate.validator';
import { AppError } from '../middlewares/error.middleware';

export const gateController = {
  /**
   * GET /api/gates
   * Danh sách cổng vào/ra
   */
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const { type, status, zoneId, page, limit } = req.query;

      const result = await gateService.getAll({
        type: type as string,
        status: status as string,
        zoneId: zoneId as string,
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 20,
      });

      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/gates/available
   * Lấy cổng khả dụng theo loại (ENTRY/EXIT) - dùng khi tạo session
   */
  async getAvailable(req: Request, res: Response, next: NextFunction) {
    try {
      const { type, zoneId } = req.query;

      if (!type || !['ENTRY', 'EXIT'].includes(type as string)) {
        throw new AppError('type phải là ENTRY hoặc EXIT', 400);
      }

      const data = await gateService.getAvailableGates(
        type as 'ENTRY' | 'EXIT',
        zoneId as string | undefined
      );

      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/gates/:id
   * Chi tiết một cổng
   */
  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const data = await gateService.getById(id);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/gates
   * Thêm cổng mới
   */
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { error, value } = createGateSchema.validate(req.body, {
        abortEarly: false,
      });
      if (error) {
        const messages = error.details.map((d) => d.message);
        throw new AppError(messages.join('; '), 422);
      }

      const actorId = (req as any).user?.id ?? 'system';
      const data = await gateService.create(value, actorId);

      res.status(201).json({
        success: true,
        message: 'Tạo cổng thành công',
        data,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * PATCH /api/gates/:id
   * Cập nhật thông tin cổng
   */
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const { error, value } = updateGateSchema.validate(req.body, {
        abortEarly: false,
      });
      if (error) {
        const messages = error.details.map((d) => d.message);
        throw new AppError(messages.join('; '), 422);
      }

      const actorId = (req as any).user?.id ?? 'system';
      const data = await gateService.update(id, value, actorId);

      res.json({
        success: true,
        message: 'Cập nhật cổng thành công',
        data,
      });
    } catch (error) {
      next(error);
    }
  },
};
