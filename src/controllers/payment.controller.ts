import { Request, Response, NextFunction } from 'express';
import { paymentService } from '../services/payment.service';
import { AppError } from '../middlewares/error.middleware';

export const paymentController = {
  // =====================================================================
  // 1. THANH TOÁN TIỀN MẶT / THỦ CÔNG
  // =====================================================================
  async createPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await paymentService.createPayment(req.body);

      // Phát sự kiện Socket.io cập nhật bãi đỗ xe cho Client (Frontend)
      if (req.app.get('io')) {
        req.app.get('io').emit('slot:update', {
          message: 'Một chỗ đỗ xe vừa được giải phóng (Tiền mặt)',
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

      // Lấy IP của người dùng gửi cho VNPay
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
      
      // Nếu VNPay báo thành công, phát sự kiện Socket.io mở cổng cho xe ra
      if (result.code === '00' && req.app.get('io')) {
        req.app.get('io').emit('slot:update', {
          message: 'Thanh toán VNPay thành công, đã giải phóng chỗ đỗ',
          timestamp: new Date()
        });
      }

      // BẮT BUỘC TRẢ VỀ STATUS 200 THEO ĐỊNH DẠNG CỦA VNPAY
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