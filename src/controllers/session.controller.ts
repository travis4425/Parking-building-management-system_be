import { Request, Response, NextFunction } from 'express';
import { sessionService } from '../services/session.service';
import { createSessionSchema, checkoutSessionSchema } from '../validators/session.validator';
import { AppError } from '../middlewares/error.middleware';

export const sessionController = {
  // --- API DANH SÁCH / TÌM KIẾM ---
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const { status, qrToken, licensePlate, slotId, page, limit } = req.query;

      const result = await sessionService.getAll({
        status: status as string,
        qrToken: qrToken as string,
        licensePlate: licensePlate as string,
        slotId: slotId as string,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      });

      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  },

  // --- API CHI TIẾT 1 PHIÊN ---
  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const session = await sessionService.getById(req.params.id);
      res.json({ success: true, data: session });
    } catch (error) {
      next(error);
    }
  },

  // --- API CHECK-IN ---
  async checkIn(req: Request, res: Response, next: NextFunction) {
    try {
      const { error, value } = createSessionSchema.validate(req.body, {
        abortEarly: false,
      });

      if (error) {
        const errorMessage = error.details.map((err) => err.message).join(', ');
        throw new AppError(errorMessage, 400);
      }

      const session = await sessionService.checkIn(value);

      res.status(201).json({
        success: true,
        message: 'Check-in thành công',
        data: session,
      });
    } catch (error) {
      next(error);
    }
  },

  // --- API CHECK-OUT ---
  async checkOut(req: Request, res: Response, next: NextFunction) {
    try {
      const { error, value } = checkoutSessionSchema.validate(req.body, {
        abortEarly: false,
      });

      if (error) {
        const errorMessage = error.details.map((err) => err.message).join(', ');
        throw new AppError(errorMessage, 400);
      }

      const session = await sessionService.checkOut(value);

      res.status(200).json({
        success: true,
        message: 'Check-out thành công',
        data: session,
      });
    } catch (error) {
      next(error);
    }
  },
};
