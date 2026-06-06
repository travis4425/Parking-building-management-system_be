import { Request, Response, NextFunction } from 'express';
import { reservationService } from '../services/reservation.service';
import { createReservationSchema, cancelReservationSchema } from '../validators/reservation.validator';
import { AppError } from '../middlewares/error.middleware';

export const reservationController = {
  /**
   * GET /api/reservations
   */
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId, status, page, limit } = req.query;

      const result = await reservationService.getAll(
        userId as string,
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
   * GET /api/reservations/active
   * Đặt chỗ đang hiệu lực
   */
  async getActive(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit } = req.query;

      const result = await reservationService.getActive(
        page ? Number(page) : 1,
        limit ? Number(limit) : 20
      );

      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/reservations/user/:userId
   * Đặt chỗ của driver
   */
  async getByUserId(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit } = req.query;

      const result = await reservationService.getByUserId(
        req.params.userId,
        page ? Number(page) : 1,
        limit ? Number(limit) : 20
      );

      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/reservations/:id
   */
  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await reservationService.getById(req.params.id);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/reservations
   * Tạo đặt chỗ
   */
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { error, value } = createReservationSchema.validate(req.body);

      if (error) {
        throw new AppError(error.details[0].message, 400);
      }

      const data = await reservationService.create({
        ...value,
        startTime: new Date(value.startTime),
      });

      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  /**
   * PATCH /api/reservations/:id/cancel
   * Hủy đặt chỗ
   */
  async cancel(req: Request, res: Response, next: NextFunction) {
    try {
      const { error } = cancelReservationSchema.validate(req.body);

      if (error) {
        throw new AppError(error.details[0].message, 400);
      }

      const data = await reservationService.cancel(req.params.id);

      res.json({ success: true, data, message: 'Reservation cancelled' });
    } catch (error) {
      next(error);
    }
  },
};
