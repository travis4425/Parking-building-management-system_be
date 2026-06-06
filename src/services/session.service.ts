import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../middlewares/error.middleware';

const prisma = new PrismaClient();

export interface CreateSessionDto {
  slotId: string;
  licensePlate: string;
  vehicleTypeId: string;
  gateInId: string;
}

export interface CheckoutSessionDto {
  qrToken: string;
  gateOutId: string;
}

export const sessionService = {
  // --- LUỒNG CHECK-IN ---
  async checkIn(data: CreateSessionDto) {
    const slot = await prisma.slot.findUnique({
      where: { id: data.slotId },
    });

    if (!slot) throw new AppError('Không tìm thấy chỗ đỗ xe này', 404);
    if (slot.status !== 'AVAILABLE') throw new AppError('Chỗ đỗ xe không còn trống', 400);

    const qrToken = uuidv4();

    const result = await prisma.$transaction(async (tx) => {
      // 1. Đổi Slot thành OCCUPIED
      await tx.slot.update({
        where: { id: data.slotId },
        data: { status: 'OCCUPIED' },
      });

      // 2. Tạo Session mới
      const newSession = await tx.session.create({
        data: {
          slotId: data.slotId,
          zoneId: slot.zoneId,
          licensePlate: data.licensePlate,
          vehicleTypeId: data.vehicleTypeId,
          gateInId: data.gateInId,
          qrToken: qrToken,
          status: 'ACTIVE',
          entryTime: new Date(),
        },
        include: {
          slot: { select: { code: true, zone: { select: { name: true } } } },
          vehicleType: { select: { name: true } },
        },
      });

      return newSession;
    });

    return result;
  },

  // --- LUỒNG CHECK-OUT ---
  async checkOut(data: CheckoutSessionDto) {
    const session = await prisma.session.findUnique({
      where: { qrToken: data.qrToken },
    });

    if (!session) throw new AppError('Không tìm thấy phiên gửi xe (Mã QR không hợp lệ)', 404);
    if (session.status !== 'ACTIVE') throw new AppError('Phiên gửi xe này đã kết thúc', 400);

    // Tạm fix cứng phí 5000 VNĐ
    const totalFee = 5000;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Chốt phiên gửi xe thành COMPLETED
      const updatedSession = await tx.session.update({
        where: { id: session.id },
        data: {
          status: 'COMPLETED',
          exitTime: new Date(),
          gateOutId: data.gateOutId,
          totalFee: totalFee,
        },
      });

      // 2. Giải phóng chỗ đỗ xe (Đổi lại thành AVAILABLE)
      if (session.slotId) {
        await tx.slot.update({
          where: { id: session.slotId },
          data: { status: 'AVAILABLE' },
        });
      }

      return updatedSession;
    });

    return result;
  },
};