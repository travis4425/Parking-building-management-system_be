import { Request, Response, NextFunction } from 'express';
import prisma from '../config/db';
// import { PrismaClient } from '@prisma/client';
import { suggestOptimalSlot, predictPeakHours } from '../services/ai.service';
import { AppError } from '../middlewares/error.middleware';

// const prisma = new PrismaClient();

// POST /api/ai/suggest-slot
export const suggestSlot = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { vehicleTypeCode, entryGateCode } = req.body;

    if (!vehicleTypeCode || !entryGateCode) {
      return next(new AppError('Vui lòng cung cấp vehicleTypeCode và entryGateCode', 400));
    }

    // 1. Tìm thông tin Loại xe và Cổng vào
    const vehicleType = await prisma.vehicleType.findUnique({ where: { code: vehicleTypeCode } });
    const gate = await prisma.gate.findUnique({ where: { code: entryGateCode } });

    if (!vehicleType || !gate) {
      return next(new AppError('Loại xe hoặc cổng vào không hợp lệ', 404));
    }

    // 2. Tìm các khu vực (Zone) cho phép loại xe này
    const allowedZones = await prisma.zoneVehicleRule.findMany({
      where: { vehicleTypeId: vehicleType.id },
      select: { zoneId: true }
    });
    const zoneIds = allowedZones.map(z => z.zoneId);

    // 3. Lấy danh sách các chỗ trống (Slot) trong các khu vực đó
    const availableSlots = await prisma.parkingSlot.findMany({
      where: {
        zoneId: { in: zoneIds },
        status: 'AVAILABLE'
      },
      select: { id: true, code: true, zone: { select: { name: true } } },
      take: 10 // Giới hạn lấy 10 slot trống đưa cho AI phân tích để tối ưu token
    });

    if (availableSlots.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'Bãi xe đã hết chỗ cho loại xe này',
        data: null
      });
    }

    // 4. Gọi AI Service để phân tích
    const aiSuggestion = await suggestOptimalSlot(vehicleType.name, gate.name, availableSlots);

    res.status(200).json({
      success: true,
      message: 'Gợi ý vị trí thành công',
      data: aiSuggestion
    });

  } catch (error) {
    next(error);
  }
};

// POST /api/ai/predict-peak
export const predictPeak = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 1. Lấy dữ liệu 100 phiên đỗ xe gần nhất để AI phân tích
    // (Trong thực tế có thể query nhóm theo giờ đỗ xe)
    const recentSessions = await prisma.parkingSession.findMany({
      where: { status: 'COMPLETED' },
      orderBy: { entryTime: 'desc' },
      take: 100,
      select: {
        entryTime: true,
        exitTime: true,
        vehicleType: { select: { name: true } }
      }
    });

    if (recentSessions.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'Chưa có đủ dữ liệu lịch sử để dự báo',
        data: null
      });
    }

    // 2. Gọi AI Service
    const prediction = await predictPeakHours(recentSessions);

    res.status(200).json({
      success: true,
      message: 'Dự báo giờ cao điểm thành công',
      data: prediction
    });

  } catch (error) {
    next(error);
  }
};