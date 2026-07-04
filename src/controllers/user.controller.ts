import { Request, Response, NextFunction } from 'express';
import prisma from '../config/db';
import { AppError } from '../middlewares/error.middleware';

export const userController = {
  // GET /api/users/by-qr/:token — staff quét QR driver để lấy thông tin xe
  async getByQrToken(req: Request, res: Response, next: NextFunction) {
    try {
      const { token } = req.params;
      const user = await prisma.user.findUnique({
        where: { qrToken: token },
        include: { vehicleType: { select: { id: true, name: true, code: true } } },
      });
      if (!user) return next(new AppError('Mã QR không hợp lệ hoặc chưa được kích hoạt', 404));
      if (user.role !== 'DRIVER') return next(new AppError('QR này không phải của tài xế', 400));
      if (!user.licensePlate) return next(new AppError('Tài khoản chưa cập nhật biển số xe', 400));

      res.json({
        success: true,
        data: {
          id: user.id,
          fullName: user.fullName,
          licensePlate: user.licensePlate,
          vehicleType: user.vehicleType,   // { id, name, code }
        },
      });
    } catch (err) {
      next(err);
    }
  },
};
