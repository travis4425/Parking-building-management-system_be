import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../middlewares/error.middleware';
import prisma from '../config/db';
import { pricingService } from './pricing.service';

export interface CreateSessionDto {
  slotId: string;
  gateInId?: string;
  // --- Luồng cũ (staff nhập tay) ---
  licensePlate?: string;
  vehicleTypeId?: string;
  // --- Luồng mới (staff quét QR driver account) ---
  driverQrToken?: string;  // user.qrToken → tự lấy plate + vehicleType từ account driver
}

export interface CheckoutSessionDto {
  qrToken?: string;        // session.qrToken (luồng cũ — kiosk quét QR session)
  driverQrToken?: string;  // user.qrToken (luồng mới — staff quét QR account driver)
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
    const slot = await prisma.slot.findUnique({ where: { id: data.slotId } });
    if (!slot) throw new AppError('Không tìm thấy chỗ đỗ xe này', 404);
    if (slot.status !== 'AVAILABLE') throw new AppError('Chỗ đỗ xe không còn trống', 400);

    // ── Resolve thông tin xe: từ QR driver account hoặc nhập tay ──────────────
    let resolvedLicensePlate: string;
    let resolvedVehicleTypeId: string;
    let resolvedUserId: string | undefined;

    if (data.driverQrToken) {
      // Luồng mới: staff quét QR account của driver
      const driver = await prisma.user.findUnique({
        where: { qrToken: data.driverQrToken },
        include: { vehicleType: true },
      });
      if (!driver) throw new AppError('Mã QR driver không hợp lệ', 404);
      if (driver.role !== 'DRIVER') throw new AppError('QR này không phải của tài xế', 400);
      if (!driver.licensePlate) throw new AppError('Tài khoản driver chưa cập nhật biển số xe', 400);
      if (!driver.vehicleTypeId) throw new AppError('Tài khoản driver chưa cập nhật loại xe', 400);

      resolvedLicensePlate = driver.licensePlate.toUpperCase();
      resolvedVehicleTypeId = driver.vehicleTypeId;
      resolvedUserId = driver.id;
    } else {
      // Luồng cũ: staff nhập tay licensePlate + vehicleTypeId
      if (!data.vehicleTypeId) throw new AppError('Vui lòng cung cấp loại xe', 400);
      resolvedVehicleTypeId = data.vehicleTypeId;

      const vehicleType = await prisma.vehicleType.findUnique({ where: { id: data.vehicleTypeId } });
      if (!vehicleType) throw new AppError('Không tìm thấy loại xe', 404);

      let lp = data.licensePlate?.trim().toUpperCase();
      if (!lp) {
        if (vehicleType.code !== 'BICYCLE') throw new AppError('Biển số xe là bắt buộc', 400);
        lp = `BICYCLE-${Date.now().toString(36).toUpperCase()}`;
      }
      resolvedLicensePlate = lp;
    }

    // Kiểm tra slot có phù hợp loại xe không
    if (slot.vehicleTypeId && slot.vehicleTypeId !== resolvedVehicleTypeId) {
      throw new AppError('Loại xe không phù hợp với chỗ đỗ đã chọn', 400);
    }

    // Kiểm tra biển số đang có session ACTIVE chưa
    const existingActiveSession = await prisma.session.findFirst({
      where: {
        licensePlate: { equals: resolvedLicensePlate, mode: 'insensitive' },
        status: { in: ['ACTIVE', 'PAYMENT_PENDING'] },
      },
      select: { id: true },
    });
    if (existingActiveSession) {
      throw new AppError(
        `Biển số ${resolvedLicensePlate} đang có phiên đỗ xe hoạt động. Hãy check-out phiên đó trước.`,
        409,
      );
    }

    const sessionQrToken = uuidv4();

    const result = await prisma.$transaction(async (tx) => {
      const occupied = await tx.slot.updateMany({
        where: { id: data.slotId, status: 'AVAILABLE' },
        data: { status: 'OCCUPIED' },
      });
      if (occupied.count !== 1) throw new AppError('Chỗ đỗ xe không còn trống', 409);

      const newSession = await tx.session.create({
        data: {
          slotId: data.slotId,
          zoneId: slot.zoneId,
          licensePlate: resolvedLicensePlate,
          vehicleTypeId: resolvedVehicleTypeId,
          userId: resolvedUserId,
          gateInId: data.gateInId,
          qrToken: sessionQrToken,
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
    if (!data.qrToken && !data.driverQrToken) {
      throw new AppError('Vui lòng cung cấp mã QR để check-out', 400);
    }

    // 1. Tìm phiên gửi xe:
    //    - Luồng mới: staff quét QR account driver → tìm session ACTIVE theo userId
    //    - Luồng cũ: kiosk quét QR session trực tiếp
    let session: any = null;

    if (data.driverQrToken) {
      const driver = await prisma.user.findUnique({ where: { qrToken: data.driverQrToken } });
      if (!driver) throw new AppError('Mã QR driver không hợp lệ', 404);

      session = await prisma.session.findFirst({
        where: {
          userId: driver.id,
          status: { in: ['ACTIVE', 'PAYMENT_PENDING'] },
        },
        orderBy: { entryTime: 'desc' },
        include: { vehicleType: true },
      });
    } else {
      session = await prisma.session.findUnique({
        where: { qrToken: data.qrToken! },
        include: { vehicleType: true },
      });
    }

    if (!session) throw new AppError('Không tìm thấy phiên gửi xe (Mã QR không hợp lệ)', 404);
    if (session.status !== 'ACTIVE') throw new AppError('Phiên gửi xe này đã kết thúc', 400);
    if (!session.entryTime) throw new AppError('Dữ liệu thời gian vào không hợp lệ', 400);

    // 2. Tính tiền động — dùng chung pricingService (overnightRate, giờ cao điểm, phụ thu mất vé)
    const exitTime = new Date();
    const entryTime = session.entryTime;
    // Chuyển giờ sang múi giờ Việt Nam (UTC+7) trước khi kiểm tra giờ cao điểm
    const vnHour = (exitTime.getUTCHours() + 7) % 24;
    const isPeak = await pricingService.isPeakHour(vnHour);

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
          status: 'PAYMENT_PENDING',
          exitTime: exitTime,
          gateOutId: data.gateOutId,
          totalFee: totalFee,
        },
      });

      return updatedSession;
    });

    return { ...result, priceBreakdown: priceResult };
  },
};
