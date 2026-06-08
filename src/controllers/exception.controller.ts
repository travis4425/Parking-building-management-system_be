import { Request, Response, NextFunction } from 'express';
import { exceptionService } from '../services/exception.service';

export const exceptionController = {
  async handleLostTicket(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await exceptionService.handleLostTicket(req.body);
      res.status(201).json({ success: true, message: 'Đã ghi nhận lỗi mất thẻ và áp phí phụ thu', data: result });
    } catch (error) { next(error); }
  },

  async handleWrongPlate(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await exceptionService.handleWrongPlate(req.body);
      res.status(201).json({ success: true, message: 'Đã cập nhật biển số mới thành công', data: result });
    } catch (error) { next(error); }
  },

  async handleWrongZone(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await exceptionService.handleWrongZone(req.body);
      res.status(201).json({ success: true, message: 'Đã ghi nhận lỗi đỗ sai khu vực', data: result });
    } catch (error) { next(error); }
  },

  async getAllExceptions(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await exceptionService.getAllExceptions();
      res.status(200).json({ success: true, data: result });
    } catch (error) { next(error); }
  }
};