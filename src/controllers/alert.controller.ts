import { Request, Response, NextFunction } from 'express';
import { alertService } from '../services/alert.service';
import { createAlertSchema } from '../validators/alert.validator';
import { AppError } from '../middlewares/error.middleware';

export const alertController = {
  // GET /api/alerts
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const { status, type, slotId, page, limit } = req.query;

      const result = await alertService.getAll({
        status: status as string,
        type: type as string,
        slotId: slotId as string,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      });

      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/alerts/:id
  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await alertService.getById(req.params.id);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/alerts
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { error, value } = createAlertSchema.validate(req.body);

      if (error) {
        throw new AppError(error.details[0].message, 400);
      }

      const data = await alertService.create(value);

      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  // PATCH /api/alerts/:id/resolve
  async resolve(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await alertService.resolve(req.params.id);
      res.json({ success: true, data, message: 'Đã xử lý cảnh báo' });
    } catch (error) {
      next(error);
    }
  },

  // DELETE /api/alerts/:id
  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await alertService.delete(req.params.id);
      res.json({ success: true, data, message: 'Đã xoá cảnh báo' });
    } catch (error) {
      next(error);
    }
  },
};
