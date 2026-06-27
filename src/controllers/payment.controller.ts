import { Request, Response, NextFunction } from 'express';
import { paymentService } from '../services/payment.service';
import { AppError } from '../middlewares/error.middleware';

export const paymentController = {
  // =====================================================================
  // 1. THANH TOÁN TIỀN MẶT / THỦ CÔNG
  // =====================================================================
  async createPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const { sessionId } = req.body;
      const result = await paymentService.createPayment(req.body);

      // 🔥 SỬA: Đổi sang event `payment:success` và đính kèm `sessionId`
      if (req.app.get('io')) {
        req.app.get('io').emit('payment:success', {
          sessionId: sessionId,
          message: 'Thanh toán tiền mặt thành công',
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

  // =====================================================================
  // 2. TẠO URL THANH TOÁN VNPAY (QR / Chuyển khoản)
  // =====================================================================
  async createPaymentUrl(req: Request, res: Response, next: NextFunction) {
    try {
      const { sessionId, amount } = req.body;
      if (!sessionId || !amount) {
        throw new AppError('Thiếu sessionId hoặc amount', 400);
      }

      const ipAddr = req.headers['x-forwarded-for']?.toString() || 
                     req.socket.remoteAddress || 
                     '127.0.0.1';

      const paymentUrl = await paymentService.createPaymentUrl(sessionId, amount, ipAddr);
      
      res.status(200).json({
        success: true,
        message: 'Tạo URL thanh toán thành công',
        data: { paymentUrl }
      });
    } catch (error) {
      next(error);
    }
  },

  // =====================================================================
  // 3. VNPAY IPN WEBHOOK (VNPay tự động gọi ngầm vào đây)
  // =====================================================================
  async vnpayIpn(req: Request, res: Response, next: NextFunction) {
    try {
      const vnp_Params = req.query;
      const result = await paymentService.vnpayIpn(vnp_Params);
      
      // 🔥 SỬA: Bắn event `payment:success` với `sessionId` trả về từ Service
      if (result.code === '00' && req.app.get('io') && result.sessionId) {
        req.app.get('io').emit('payment:success', {
          sessionId: result.sessionId,
          message: 'Thanh toán VNPay tự động thành công',
          timestamp: new Date()
        });
      }

      return res.status(200).json({ RspCode: result.code, Message: result.message });
    } catch (error) {
      console.error('VNPay IPN Error:', error);
      return res.status(200).json({ RspCode: '99', Message: 'Unknown error' });
    }
  },

  // =====================================================================
  // 4. LẤY THÔNG TIN THANH TOÁN THEO SESSION ID
  // =====================================================================
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

  // =====================================================================
  // 5. LẤY BÁO CÁO DOANH THU
  // =====================================================================
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