// import { PrismaClient, Prisma } from '@prisma/client';
import { Prisma } from '@prisma/client';
import prisma from '../config/db';
import { AppError } from '../middlewares/error.middleware';

// const prisma = new PrismaClient();

export interface CreateZoneDto {
  name: string;
  description?: string;
  floor: number;
  capacity: number;
  status?: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
}

export interface UpdateZoneDto {
  name?: string;
  description?: string;
  floor?: number;
  capacity?: number;
  status?: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
}

export interface ZoneFilters {
  status?: string;
  floor?: number;
  page?: number;
  limit?: number;
}

export const zoneService = {
  async getAll(filters: ZoneFilters = {}) {
    const { status, floor, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.ZoneWhereInput = {};
    if (status) where.status = status as any;
    if (floor !== undefined) where.floor = floor;

    const [zones, total] = await Promise.all([
      prisma.zone.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ floor: 'asc' }, { name: 'asc' }],
        include: {
          _count: {
            select: {
              slots: true,
              gates: true,
            },
          },
          slots: {
            where: { status: 'AVAILABLE' },
            select: { id: true },
          },
          zoneVehicleRules: {
            include: {
              vehicleType: {
                select: { id: true, name: true, code: true },
              },
            },
          },
        },
      }),
      prisma.zone.count({ where }),
    ]);

    const formattedZones = zones.map((zone) => ({
      id: zone.id,
      name: zone.name,
      description: zone.description,
      floor: zone.floor,
      capacity: zone.capacity,
      status: zone.status,
      availableSlots: zone.slots.length,
      totalSlots: (zone as any)._count.slots,
      gateCount: (zone as any)._count.gates,
      allowedVehicleTypes: zone.zoneVehicleRules.map((r) => r.vehicleType),
      createdAt: zone.createdAt,
      updatedAt: zone.updatedAt,
    }));

    return {
      data: formattedZones,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async getById(id: string) {
    const zone = await prisma.zone.findUnique({
      where: { id },
      include: {
        gates: {
          where: { status: { not: 'INACTIVE' } },
          orderBy: { name: 'asc' },
        },
        slots: {
          orderBy: { code: 'asc' },
        },
        zoneVehicleRules: {
          include: {
            vehicleType: true,
          },
        },
        _count: {
          select: {
            slots: true,
          },
        },
      },
    });

    if (!zone) {
      throw new AppError('Không tìm thấy khu vực', 404);
    }

    const availableSlots = zone.slots.filter(
      (s) => s.status === 'AVAILABLE'
    ).length;
    const occupiedSlots = zone.slots.filter(
      (s) => s.status === 'OCCUPIED'
    ).length;
    const reservedSlots = zone.slots.filter(
      (s) => s.status === 'RESERVED'
    ).length;

    return {
      ...zone,
      stats: {
        total: (zone as any)._count.slots,
        available: availableSlots,
        occupied: occupiedSlots,
        reserved: reservedSlots,
        occupancyRate:
          (zone as any)._count.slots > 0
            ? Math.round(
                (occupiedSlots / (zone as any)._count.slots) * 100
              )
            : 0,
      },
    };
  },

  async create(data: CreateZoneDto, actorId: string) {
    const existing = await prisma.zone.findFirst({
      where: {
        name: data.name,
        floor: data.floor,
      },
    });

    if (existing) {
      throw new AppError(
        `Đã tồn tại khu vực "${data.name}" ở tầng ${data.floor}`,
        409
      );
    }

    const zone = await prisma.zone.create({
      data: {
        name: data.name,
        description: data.description,
        floor: data.floor,
        capacity: data.capacity,
        status: data.status ?? 'ACTIVE',
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: actorId,
        action: 'CREATE',
        resource: 'Zone',
        resourceId: zone.id,
        newData: JSON.stringify(zone), // Đã Fix Stringify
      },
    });

    return zone;
  },

  async update(id: string, data: UpdateZoneDto, actorId: string) {
    const existing = await prisma.zone.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('Không tìm thấy khu vực', 404);
    }

    if (data.name || data.floor !== undefined) {
      const nameToCheck = data.name ?? existing.name;
      const floorToCheck = data.floor ?? existing.floor;

      const duplicate = await prisma.zone.findFirst({
        where: {
          name: nameToCheck,
          floor: floorToCheck,
          id: { not: id },
        },
      });

      if (duplicate) {
        throw new AppError(
          `Đã tồn tại khu vực "${nameToCheck}" ở tầng ${floorToCheck}`,
          409
        );
      }
    }

    if (data.capacity !== undefined && data.capacity < existing.capacity) {
      const occupiedCount = await prisma.slot.count({
        where: {
          zoneId: id,
          status: { in: ['OCCUPIED', 'RESERVED'] },
        },
      });

      if (data.capacity < occupiedCount) {
        throw new AppError(
          `Không thể giảm sức chứa xuống ${data.capacity} vì hiện có ${occupiedCount} chỗ đang sử dụng`,
          400
        );
      }
    }

    const updateData: Prisma.ZoneUpdateInput = {};
    if (data.name) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.floor !== undefined) updateData.floor = data.floor;
    if (data.capacity !== undefined) updateData.capacity = data.capacity;
    if (data.status) updateData.status = data.status;

    const updated = await prisma.zone.update({
      where: { id },
      data: updateData,
    });

    await prisma.auditLog.create({
      data: {
        userId: actorId,
        action: 'UPDATE',
        resource: 'Zone',
        resourceId: id,
        oldData: JSON.stringify(existing), // Đã Fix Stringify
        newData: JSON.stringify(updated), // Đã Fix Stringify
      },
    });

    return updated;
  },

  async getSummary() {
    const zones = await prisma.zone.findMany({
      where: { status: 'ACTIVE' },
      include: {
        slots: {
          select: { status: true },
        },
      },
      orderBy: { floor: 'asc' },
    });

    return zones.map((zone) => {
      const total = zone.slots.length;
      const available = zone.slots.filter(
        (s) => s.status === 'AVAILABLE'
      ).length;
      const occupied = zone.slots.filter(
        (s) => s.status === 'OCCUPIED'
      ).length;

      return {
        id: zone.id,
        name: zone.name,
        floor: zone.floor,
        capacity: zone.capacity,
        totalSlots: total,
        availableSlots: available,
        occupiedSlots: occupied,
        occupancyRate: total > 0 ? Math.round((occupied / total) * 100) : 0,
        status: zone.status,
      };
    });
  },
};
