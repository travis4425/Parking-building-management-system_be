import { Request, Response, NextFunction } from 'express';
import { paymentService } from '../services/payment.service';

export const paymentController = {
  // 1. Xử lý tạo thanh toán
  async createPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await paymentService.createPayment(req.body);

      // Phát sự kiện Socket.io cập nhật bãi đỗ xe cho Client (Frontend)
      if (req.app.get('io')) {
        req.app.get('io').emit('slot:update', {
          message: 'Một chỗ đỗ xe vừa được giải phóng',
          timestamp: new Date()
        });
      }

      res.status(201).json({
        success: true,
        message: 'Thanh toán thành công và đã giải phóng chỗ đỗ',
        data: result
      });
    } catch (error) {
      next(error);
    }
  },

  // 2. Lấy thông tin thanh toán theo Session ID
  async getPaymentBySessionId(req: Request, res: Response, next: NextFunction) {
    try {
      const { sessionId } = req.params;
      const result = await paymentService.getPaymentBySessionId(sessionId);
      
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  },

  // 3. Lấy báo cáo tổng quan doanh thu
  async getPaymentSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await paymentService.getPaymentSummary();
      
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
};