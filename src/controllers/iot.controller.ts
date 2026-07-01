import { Request, Response, NextFunction } from 'express';
import { AppError } from '../middlewares/error.middleware';
import { getIO } from '../config/socket';

// ⚠️ DEPRECATED: Hệ thống không triển khai phần cứng IoT/sensor thực tế.
// Route /api/iot vẫn giữ lại để không phá vỡ swagger/client cũ, nhưng
// trả về danh sách rỗng thay vì dữ liệu giả trong RAM.

// GET /api/iot/devices
export const getDevices = (_req: Request, res: Response) => {
  res.status(200).json({ success: true, data: [] });
};

// PATCH /api/iot/devices/:id/status
export const updateDeviceStatus = (_req: Request, res: Response, next: NextFunction) => {
  return next(new AppError('Hệ thống chưa tích hợp thiết bị IoT thực tế', 501));
};
