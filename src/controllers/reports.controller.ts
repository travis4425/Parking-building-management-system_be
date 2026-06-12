import { Request, Response, NextFunction } from 'express';
import { reportsService } from '../services/reports.service';
import { AppError } from '../middlewares/error.middleware';

export const reportsController = {
  /**
   * GET /api/reports/revenue
   * Doanh thu theo ngày/tuần/tháng
   */
  async getRevenue(req: Request, res: Response, next: NextFunction) {
    try {
      const { period, startDate, endDate } = req.query;

      if (period && !['day', 'week', 'month'].includes(period as string)) {
        throw new AppError('period must be: day, week, or month', 400);
      }

      const data = await reportsService.getRevenue(
        (period as 'day' | 'week' | 'month') || 'day',
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );

      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/reports/traffic
   * Lưu lượng xe theo giờ trong ngày
   */
  async getTraffic(req: Request, res: Response, next: NextFunction) {
    try {
      const { startDate, endDate } = req.query;

      const data = await reportsService.getTraffic(
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );

      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/reports/occupancy
   * Tỷ lệ lấp đầy theo tầng
   */
  async getOccupancy(req: Request, res: Response, next: NextFunction) {
    try {
      const { startDate, endDate } = req.query;

      const data = await reportsService.getOccupancy(
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );

      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/reports/vehicle-types
   * Phân bổ theo loại xe
   */
  async getVehicleTypeDistribution(req: Request, res: Response, next: NextFunction) {
    try {
      const { startDate, endDate } = req.query;

      const data = await reportsService.getVehicleTypeDistribution(
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );

      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/reports/peak-hours
   * Thống kê giờ cao điểm
   */
  async getPeakHours(req: Request, res: Response, next: NextFunction) {
    try {
      const { startDate, endDate } = req.query;

      const data = await reportsService.getPeakHours(
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );

      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },
};
