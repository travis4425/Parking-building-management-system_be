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
    // 1. Tìm phiên gửi xe & lấy kèm thông tin loại xe để tính giá
    const session = await prisma.session.findUnique({
      where: { qrToken: data.qrToken },
      include: {
        vehicleType: true, // Lấy thông tin loại xe (Ô tô / Xe máy)
      }
    });

    if (!session) throw new AppError('Không tìm thấy phiên gửi xe (Mã QR không hợp lệ)', 404);
    if (session.status !== 'ACTIVE') throw new AppError('Phiên gửi xe này đã kết thúc', 400);
    if (!session.entryTime) throw new AppError('Dữ liệu thời gian vào không hợp lệ', 400);

    // 2. Logic tính tiền động (Dynamic Pricing)
    const exitTime = new Date();
    const entryTime = session.entryTime;
    
    // Tính khoảng thời gian gửi bằng mili-giây, sau đó đổi ra giờ
    const durationMs = exitTime.getTime() - entryTime.getTime();
    const durationHours = Math.ceil(durationMs / (1000 * 60 * 60)); // Math.ceil để làm tròn lên (vd: 1.2 giờ -> 2 giờ)

    // Xác định đơn giá tùy theo loại xe (Có thể tùy chỉnh theo code bạn đã lưu ở bảng VehicleType)
    let pricePerHour = 0;
    const vehicleCode = session.vehicleType.code?.toUpperCase() || '';
    const vehicleName = session.vehicleType.name.toLowerCase();

    if (vehicleCode === 'MOTOR' || vehicleName.includes('xe máy')) {
      pricePerHour = 5000; // Xe máy 5k/giờ
    } else if (vehicleCode === 'CAR' || vehicleName.includes('ô tô')) {
      pricePerHour = 20000; // Ô tô 20k/giờ
    } else {
      pricePerHour = 10000; // Giá mặc định nếu không xác định được
    }

    // Đảm bảo phí tối thiểu là 1 giờ (tránh trường hợp xe vừa vào đã ra bị tính 0đ)
    const finalHours = durationHours > 0 ? durationHours : 1;
    const totalFee = finalHours * pricePerHour;

    // 3. Dùng Transaction chốt sổ
    const result = await prisma.$transaction(async (tx) => {
      const updatedSession = await tx.session.update({
        where: { id: session.id },
        data: {
          status: 'COMPLETED',
          exitTime: exitTime,
          gateOutId: data.gateOutId,
          totalFee: totalFee,
        },
      });

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