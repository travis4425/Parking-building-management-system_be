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
      const actor = (req as any).user;
      const effectiveUserId = actor?.role === 'DRIVER' ? actor.id : userId as string;

      const result = await reservationService.getAll(
        effectiveUserId,
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
      const actor = (req as any).user;

      const result = actor?.role === 'DRIVER'
        ? await reservationService.getAll(
            actor.id,
            'ACTIVE',
            page ? Number(page) : 1,
            limit ? Number(limit) : 20
          )
        : await reservationService.getActive(
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
      const actor = (req as any).user;
      if (actor?.role === 'DRIVER' && actor.id !== req.params.userId) {
        throw new AppError('Bạn không có quyền xem đặt chỗ của người dùng khác', 403);
      }
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
      const actor = (req as any).user;
      if (actor?.role === 'DRIVER' && data.userId !== actor.id) {
        throw new AppError('Bạn không có quyền xem đặt chỗ này', 403);
      }
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

      const actor = (req as any).user;
      const data = await reservationService.create({
        ...value,
        userId: actor?.role === 'DRIVER' ? actor.id : value.userId,
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

      const actor = (req as any).user;
      const reservation = await reservationService.getById(req.params.id);
      if (actor?.role === 'DRIVER' && reservation.userId !== actor.id) {
        throw new AppError('Bạn không có quyền hủy đặt chỗ này', 403);
      }

      const data = await reservationService.cancel(req.params.id);

      res.json({ success: true, data, message: 'Reservation cancelled' });
    } catch (error) {
      next(error);
    }
  },
};
