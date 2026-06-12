import { Request, Response, NextFunction } from 'express';
import { AppError } from '../middlewares/error.middleware';
import { getIO } from '../config/socket';

// Database giả lập (Nằm trên RAM)
let mockDevices = [
  { id: 'SENSOR-A01', type: 'SLOT_SENSOR', status: 'ONLINE', location: 'Slot A-01' },
  { id: 'SENSOR-A02', type: 'SLOT_SENSOR', status: 'ONLINE', location: 'Slot A-02' },
  { id: 'CAM-GATE-IN', type: 'CAMERA', status: 'OFFLINE', location: 'Cổng Vào Khu A' },
];

// GET /api/iot/devices
export const getDevices = (req: Request, res: Response) => {
  res.status(200).json({ success: true, data: mockDevices });
};

// PATCH /api/iot/devices/:id/status
export const updateDeviceStatus = (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) return next(new AppError('Vui lòng cung cấp trạng thái mới', 400));

  const device = mockDevices.find(d => d.id === id);
  if (!device) return next(new AppError('Không tìm thấy thiết bị IoT', 404));

  // Cập nhật trạng thái
  device.status = status;

  // Nếu bị chuyển sang ERROR hoặc OFFLINE -> Lập tức còi báo động qua Socket
  if (status === 'ERROR' || status === 'OFFLINE') {
    getIO().emit('alert:new', {
      deviceId: id,
      issue: `Bảo vệ chú ý: Thiết bị chuyển sang trạng thái ${status}`,
      timestamp: new Date()
    });
  }

  res.status(200).json({
    success: true,
    message: 'Cập nhật trạng thái thiết bị thành công',
    data: device
  });
};