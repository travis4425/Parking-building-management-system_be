import { Request, Response, NextFunction } from 'express';
import { slotService } from '../services/slot.service';
import {
  createSlotSchema,
  updateSlotSchema,
  updateSlotStatusSchema,
} from '../validators/slot.validator';
import { AppError } from '../middlewares/error.middleware';

export const slotController = {
  /**
   * GET /api/slots
   * Danh sách slot
   */
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const { zoneId, status, vehicleTypeId, floor, page, limit } = req.query;

      const result = await slotService.getAll({
        zoneId: zoneId as string,
        status: status as string,
        vehicleTypeId: vehicleTypeId as string,
        floor: floor !== undefined ? Number(floor) : undefined,
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 20,
      });

      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/slots/realtime
   * Danh sách slot realtime cho SlotGrid
   */
  async getRealtime(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await slotService.getRealtime();
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/slots/:id
   * Chi tiết slot
   */
  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const data = await slotService.getById(id);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/slots
   * Tạo slot mới
   */
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { error, value } = createSlotSchema.validate(req.body, {
        abortEarly: false,
      });
      if (error) {
        const messages = error.details.map((d) => d.message);
        throw new AppError(messages.join('; '), 422);
      }

      const actorId = (req as any).user?.id ?? 'system';
      const data = await slotService.create(value, actorId);

      res.status(201).json({
        success: true,
        message: 'Tạo slot thành công',
        data,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * PATCH /api/slots/:id
   * Cập nhật thông tin slot
   */
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const { error, value } = updateSlotSchema.validate(req.body, {
        abortEarly: false,
      });
      if (error) {
        const messages = error.details.map((d) => d.message);
        throw new AppError(messages.join('; '), 422);
      }

      const actorId = (req as any).user?.id ?? 'system';
      const data = await slotService.update(id, value, actorId);

      res.json({
        success: true,
        message: 'Cập nhật slot thành công',
        data,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * PATCH /api/slots/:id/status
   * Cập nhật trạng thái slot
   */
  async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const { error, value } = updateSlotStatusSchema.validate(req.body, {
        abortEarly: false,
      });
      if (error) {
        const messages = error.details.map((d) => d.message);
        throw new AppError(messages.join('; '), 422);
      }

      const actorId = (req as any).user?.id ?? 'system';
      const data = await slotService.updateStatus(id, value.status, actorId);

      res.json({
        success: true,
        message: 'Cập nhật trạng thái slot thành công',
        data,
      });
    } catch (error) {
      next(error);
    }
  },
};
