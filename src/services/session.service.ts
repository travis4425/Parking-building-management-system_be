import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../middlewares/error.middleware';
import prisma from '../config/db';
import { pricingService } from './pricing.service';

export interface CreateSessionDto {
  slotId: string;
  // Tuỳ chọn — xe đạp thường không có biển số chính thức, để trống thì tự sinh mã quản lý
  licensePlate?: string;
  vehicleTypeId: string;
  gateInId?: string;
}

export interface CheckoutSessionDto {
  qrToken: string;
  gateOutId?: string;
  lostTicket?: boolean;
}

export interface SessionQueryDto {
  status?: string;
  qrToken?: string;
  licensePlate?: string;
  slotId?: string;
  page?: number;
  limit?: number;
}

export const sessionService = {
  // --- DANH SÁCH / TÌM KIẾM PHIÊN GỬI XE ---
  async getAll(query: SessionQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.status) where.status = query.status.toUpperCase();
    if (query.qrToken) where.qrToken = query.qrToken;
    if (query.slotId) where.slotId = query.slotId;
    if (query.licensePlate) {
      where.licensePlate = { contains: query.licensePlate, mode: 'insensitive' };
    }

    const [data, total] = await Promise.all([
      prisma.session.findMany({
        where,
        skip,
        take: limit,
        orderBy: { entryTime: 'desc' },
        include: {
          slot: { select: { code: true, zone: { select: { name: true } } } },
          vehicleType: { select: { name: true, code: true } },
        },
      }),
      prisma.session.count({ where }),
    ]);

    return {
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  },

  async getById(id: string) {
    const session = await prisma.session.findUnique({
      where: { id },
      include: {
        slot: { select: { code: true, zone: { select: { name: true } } } },
        vehicleType: { select: { name: true, code: true } },
      },
    });

    if (!session) throw new AppError('Không tìm thấy phiên gửi xe', 404);

    return session;
  },

  // --- LUỒNG CHECK-IN ---
  async checkIn(data: CreateSessionDto) {
    const slot = await prisma.slot.findUnique({
      where: { id: data.slotId },
    });

    if (!slot) throw new AppError('Không tìm thấy chỗ đỗ xe này', 404);
    if (slot.status !== 'AVAILABLE') throw new AppError('Chỗ đỗ xe không còn trống', 400);

    // Một số loại xe (vd. xe đạp) không có biển số chính thức — nếu staff không nhập,
    // tự sinh mã quản lý nội bộ dựa theo code của loại xe để vẫn tra cứu/in vé được.
    const vehicleType = await prisma.vehicleType.findUnique({
      where: { id: data.vehicleTypeId },
    });
    if (!vehicleType) throw new AppError('Không tìm thấy loại xe', 404);

    let licensePlate = data.licensePlate?.trim().toUpperCase();
    if (!licensePlate) {
      if (vehicleType.code !== 'BICYCLE') {
        throw new AppError('Biển số xe là bắt buộc', 400);
      }
      const prefix = vehicleType.code.toUpperCase();
      licensePlate = `${prefix}-${Date.now().toString(36).toUpperCase()}`;
    }

    const existingActiveSession = await prisma.session.findFirst({
      where: {
        licensePlate: { equals: licensePlate, mode: 'insensitive' },
        status: 'ACTIVE',
      },
      select: { id: true },
    });
    if (existingActiveSession) {
      throw new AppError('Biển số này đang có phiên gửi xe hoạt động', 409);
    }

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
          licensePlate: licensePlate,
          vehicleTypeId: data.vehicleTypeId,
          gateInId: data.gateInId,
          qrToken: qrToken,
          status: 'ACTIVE',
          entryTime: new Date(),
        },
        include: {
          slot: { select: { code: true, zone: { select: { name: true } } } },
          vehicleType: { select: { name: true, code: true } },
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

    // 2. Tính tiền động — dùng chung pricingService (overnightRate, giờ cao điểm, phụ thu mất vé)
    const exitTime = new Date();
    const entryTime = session.entryTime;
    const isPeak = await pricingService.isPeakHour(exitTime.getHours());

    const priceResult = await pricingService.calculatePrice({
      vehicleTypeId: session.vehicleTypeId,
      entryTime,
      exitTime,
      isPeakHour: isPeak,
      lostTicket: data.lostTicket,
    });

    const totalFee = priceResult.totalFee;

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

    return { ...result, priceBreakdown: priceResult };
  },
};
