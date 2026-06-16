import { PrismaClient, Prisma } from '@prisma/client';
import { AppError } from '../middlewares/error.middleware';

const prisma = new PrismaClient({});

export type SlotStatusType =
  | 'AVAILABLE'
  | 'OCCUPIED'
  | 'RESERVED'
  | 'MAINTENANCE'
  | 'LOCKED';

export interface CreateSlotDto {
  code: string;
  zoneId: string;
  vehicleTypeId?: string | null;
  status?: SlotStatusType;
}

export interface UpdateSlotDto {
  code?: string;
  zoneId?: string;
  vehicleTypeId?: string | null;
}

export interface SlotFilters {
  zoneId?: string;
  status?: string;
  vehicleTypeId?: string;
  floor?: number;
  page?: number;
  limit?: number;
}

export const slotService = {
  async getAll(filters: SlotFilters = {}) {
    const { zoneId, status, vehicleTypeId, floor, page = 1, limit = 20 } =
      filters;
    const skip = (page - 1) * limit;

    const where: Prisma.SlotWhereInput = {};
    if (zoneId) where.zoneId = zoneId;
    if (status) where.status = status as any;
    if (vehicleTypeId) where.vehicleTypeId = vehicleTypeId;
    if (floor !== undefined) where.zone = { floor };

    const [slots, total] = await Promise.all([
      prisma.slot.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ zone: { floor: 'asc' } }, { code: 'asc' }],
        include: {
          zone: {
            select: { id: true, name: true, floor: true, status: true },
          },
          vehicleType: {
            select: { id: true, name: true, code: true },
          },
          _count: {
            select: { sessions: true },
          },
        },
      }),
      prisma.slot.count({ where }),
    ]);

    return {
      data: slots.map((slot) => ({
        id: slot.id,
        code: slot.code,
        status: slot.status,
        zone: slot.zone,
        vehicleType: slot.vehicleType,
        totalSessions: (slot as any)._count.sessions,
        createdAt: slot.createdAt,
        updatedAt: slot.updatedAt,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async getById(id: string) {
    const slot = await prisma.slot.findUnique({
      where: { id },
      include: {
        zone: true,
        vehicleType: true,
        sessions: {
          take: 5,
          orderBy: { entryTime: 'desc' },
          select: {
            id: true,
            licensePlate: true,
            entryTime: true,
            exitTime: true,
            status: true,
          },
        },
      },
    });

    if (!slot) {
      throw new AppError('Không tìm thấy slot', 404);
    }

    return slot;
  },

  async getRealtime() {
    const slots = await prisma.slot.findMany({
      include: {
        zone: { select: { id: true, name: true, floor: true } },
        vehicleType: { select: { id: true, name: true, code: true } },
      },
      orderBy: [{ zone: { floor: 'asc' } }, { code: 'asc' }],
    });

    return slots.map((slot) => ({
      id: slot.id,
      code: slot.code,
      status: slot.status,
      zone: slot.zone,
      vehicleType: slot.vehicleType,
    }));
  },

  async create(data: CreateSlotDto, actorId: string) {
    const [zone, slotCount] = await Promise.all([
      prisma.zone.findUnique({ where: { id: data.zoneId } }),
      prisma.slot.count({ where: { zoneId: data.zoneId } }),
    ]);

    if (!zone) {
      throw new AppError('Khu vực không tồn tại', 404);
    }
    if (zone.status === 'INACTIVE') {
      throw new AppError('Không thể thêm slot vào khu vực đã vô hiệu hóa', 400);
    }
    if (slotCount >= zone.capacity) {
      throw new AppError(
        `Khu vực đã đủ ${zone.capacity} slot, không thể thêm mới`,
        400
      );
    }

    const existingCode = await prisma.slot.findUnique({
      where: { code: data.code.toUpperCase() },
    });
    if (existingCode) {
      throw new AppError(`Mã slot "${data.code}" đã tồn tại`, 409);
    }

    if (data.vehicleTypeId) {
      const vehicleType = await prisma.vehicleType.findUnique({
        where: { id: data.vehicleTypeId },
      });
      if (!vehicleType) {
        throw new AppError('Loại xe không tồn tại', 404);
      }
    }

    const slot = await prisma.slot.create({
      data: {
        code: data.code.toUpperCase(),
        zoneId: data.zoneId,
        vehicleTypeId: data.vehicleTypeId ?? undefined,
        status: data.status ?? 'AVAILABLE',
      },
      include: {
        zone: { select: { id: true, name: true, floor: true } },
        vehicleType: { select: { id: true, name: true, code: true } },
      },
    });

    // ({
    //   data: {
    //     userId: actorId,
    //     action: 'CREATE',
    //     resource: 'Slot',
    //     resourceId: slot.id,
    //     newData: JSON.stringify(slot),
    //   },await prisma.auditLog.create
    // });

    return slot;
  },

  async update(id: string, data: UpdateSlotDto, actorId: string) {
    const existing = await prisma.slot.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('Không tìm thấy slot', 404);
    }

    if (data.code && data.code.toUpperCase() !== existing.code) {
      const duplicate = await prisma.slot.findUnique({
        where: { code: data.code.toUpperCase() },
      });
      if (duplicate) {
        throw new AppError(`Mã slot "${data.code}" đã tồn tại`, 409);
      }
    }

    if (data.zoneId && data.zoneId !== existing.zoneId) {
      const [zone, slotCount] = await Promise.all([
        prisma.zone.findUnique({ where: { id: data.zoneId } }),
        prisma.slot.count({ where: { zoneId: data.zoneId } }),
      ]);

      if (!zone) {
        throw new AppError('Khu vực mới không tồn tại', 404);
      }
      if (zone.status === 'INACTIVE') {
        throw new AppError('Không thể chuyển slot sang khu vực đã vô hiệu hóa', 400);
      }
      if (slotCount >= zone.capacity) {
        throw new AppError(
          `Khu vực đã đủ ${zone.capacity} slot, không thể chuyển thêm`,
          400
        );
      }
    }

    if (data.vehicleTypeId !== undefined && data.vehicleTypeId !== null) {
      const vehicleType = await prisma.vehicleType.findUnique({
        where: { id: data.vehicleTypeId },
      });
      if (!vehicleType) {
        throw new AppError('Loại xe không tồn tại', 404);
      }
    }

    const updateData: Prisma.SlotUpdateInput = {};
    if (data.code) updateData.code = data.code.toUpperCase();
    if (data.zoneId) updateData.zone = { connect: { id: data.zoneId } };
    if (data.vehicleTypeId === null) {
      updateData.vehicleType = { disconnect: true };
    }
    if (data.vehicleTypeId) {
      updateData.vehicleType = { connect: { id: data.vehicleTypeId } };
    }

    const updated = await prisma.slot.update({
      where: { id },
      data: updateData,
      include: {
        zone: { select: { id: true, name: true, floor: true } },
        vehicleType: { select: { id: true, name: true, code: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: actorId,
        action: 'UPDATE',
        resource: 'Slot',
        resourceId: id,
        oldData: JSON.stringify(existing),
        newData: JSON.stringify(updated),
      },
    });

    return updated;
  },

  async updateStatus(id: string, status: SlotStatusType, actorId: string) {
    const existing = await prisma.slot.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('Không tìm thấy slot', 404);
    }

    if (status === 'MAINTENANCE' || status === 'LOCKED') {
      const activeSessionCount = await prisma.session.count({
        where: {
          slotId: id,
          status: 'ACTIVE',
        },
      });

      if (activeSessionCount > 0) {
        throw new AppError(
          `Slot đang có ${activeSessionCount} phiên gửi xe đang hoạt động, không thể chuyển sang ${status}`,
          400
        );
      }
    }

    const updated = await prisma.slot.update({
      where: { id },
      data: { status },
      include: {
        zone: { select: { id: true, name: true, floor: true } },
        vehicleType: { select: { id: true, name: true, code: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: actorId,
        action: 'UPDATE_STATUS',
        resource: 'Slot',
        resourceId: id,
        oldData: JSON.stringify(existing),
        newData: JSON.stringify(updated),
      },
    });

    return updated;
  },
};
