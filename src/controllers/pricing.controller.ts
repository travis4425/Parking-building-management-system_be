import { Request, Response, NextFunction } from 'express';
import { pricingService } from '../services/pricing.service';
import { createPricingSchema, updatePricingSchema, calculatePricingSchema } from '../validators/pricing.validator';
import { AppError } from '../middlewares/error.middleware';

export const pricingController = {
  /**
   * GET /api/pricing
   * Danh sách bảng giá
   */
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const { vehicleTypeId, page, limit } = req.query;

      const result = await pricingService.getAll(
        vehicleTypeId as string,
        page ? Number(page) : 1,
        limit ? Number(limit) : 20
      );

      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/pricing/active
   * Bảng giá đang áp dụng
   */
  async getActive(req: Request, res: Response, next: NextFunction) {
    try {
      const { vehicleTypeId } = req.query;

      const data = await pricingService.getActive(vehicleTypeId as string);

      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/pricing/:id
   */
  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await pricingService.getById(req.params.id);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/pricing
   * Thêm mức giá mới
   */
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { error, value } = createPricingSchema.validate(req.body);

      if (error) {
        throw new AppError(error.details[0].message, 400);
      }

      const data = await pricingService.create({
        ...value,
        effectiveFrom: new Date(value.effectiveFrom),
        effectiveTo: value.effectiveTo ? new Date(value.effectiveTo) : undefined,
      });

      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  /**
   * PATCH /api/pricing/:id
   * Cập nhật giá
   */
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { error, value } = updatePricingSchema.validate(req.body);

      if (error) {
        throw new AppError(error.details[0].message, 400);
      }

      const updateData: any = { ...value };
      if (value.effectiveFrom) updateData.effectiveFrom = new Date(value.effectiveFrom);
      if (value.effectiveTo) updateData.effectiveTo = new Date(value.effectiveTo);

      const data = await pricingService.update(req.params.id, updateData);

      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  /**
   * DELETE /api/pricing/:id
   */
  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await pricingService.delete(req.params.id);

      res.json({ success: true, data, message: 'Pricing policy deleted' });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/pricing/calculate
   * Tính phí theo vehicleType + entryTime + exitTime
   */
  async calculatePrice(req: Request, res: Response, next: NextFunction) {
    try {
      const { error, value } = calculatePricingSchema.validate(req.body);

      if (error) {
        throw new AppError(error.details[0].message, 400);
      }

      const entryTime = new Date(value.entryTime);
      const exitTime = new Date(value.exitTime);

      // Check if it's peak hour
      const isPeakHour =
        value.isPeakHour !== undefined
          ? value.isPeakHour
          : await pricingService.isPeakHour(entryTime.getHours());

      const result = await pricingService.calculatePrice({
        vehicleTypeId: value.vehicleTypeId,
        entryTime,
        exitTime,
        isPeakHour,
        lostTicket: value.lostTicket,
      });

      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/pricing/peak-hours
   * Trả config giờ cao điểm (đọc từ SystemConfig, có fallback mặc định) — FE dùng để tính peak hour client-side
   */
  async getPeakHours(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await pricingService.getPeakHoursConfig();
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },
};
