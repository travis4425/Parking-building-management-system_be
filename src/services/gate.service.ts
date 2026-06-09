// import { PrismaClient, Prisma } from '@prisma/client';
import { Prisma } from '@prisma/client';
import prisma from '../config/db';
import { AppError } from '../middlewares/error.middleware';

// const prisma = new PrismaClient();

export interface CreateGateDto {
  name: string;
  code: string;
  type: 'ENTRY' | 'EXIT' | 'BOTH';
  zoneId: string;
  status?: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
}

export interface UpdateGateDto {
  name?: string;
  type?: 'ENTRY' | 'EXIT' | 'BOTH';
  zoneId?: string;
  status?: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
}

export interface GateFilters {
  type?: string;
  status?: string;
  zoneId?: string;
  page?: number;
  limit?: number;
}

export const gateService = {
  async getAll(filters: GateFilters = {}) {
    const { type, status, zoneId, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.GateWhereInput = {};
    if (type) where.type = type as any;
    if (status) where.status = status as any;
    if (zoneId) where.zoneId = zoneId;

    const [gates, total] = await Promise.all([
      prisma.gate.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ zone: { floor: 'asc' } }, { name: 'asc' }],
        include: {
          zone: {
            select: {
              id: true,
              name: true,
              floor: true,
              status: true,
            },
          },
          _count: {
            select: { entrySessions: true, exitSessions: true },
          },
        },
      }),
      prisma.gate.count({ where }),
    ]);

    return {
      data: gates.map((gate) => ({
        id: gate.id,
        name: gate.name,
        code: gate.code,
        type: gate.type,
        status: gate.status,
        zone: gate.zone,
        totalSessionsProcessed: (gate as any)._count.entrySessions + (gate as any)._count.exitSessions,
        createdAt: gate.createdAt,
        updatedAt: gate.updatedAt,
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
    const gate = await prisma.gate.findUnique({
      where: { id },
      include: {
        zone: true,
        entrySessions: {
          take: 5,
          orderBy: { entryTime: 'desc' },
          select: {
            id: true,
            licensePlate: true,
            entryTime: true,
            status: true,
          },
        },
        exitSessions: {
          take: 5,
          orderBy: { exitTime: 'desc' },
          select: {
            id: true,
            licensePlate: true,
            exitTime: true,
            status: true,
          },
        }
      },
    });

    if (!gate) {
      throw new AppError('Không tìm thấy cổng', 404);
    }

    return gate;
  },

  async create(data: CreateGateDto, actorId: string) {
    const zone = await prisma.zone.findUnique({
      where: { id: data.zoneId },
    });
    if (!zone) {
      throw new AppError('Khu vực không tồn tại', 404);
    }
    if (zone.status === 'INACTIVE') {
      throw new AppError('Không thể thêm cổng vào khu vực đã vô hiệu hóa', 400);
    }

    const existingCode = await prisma.gate.findUnique({
      where: { code: data.code.toUpperCase() },
    });
    if (existingCode) {
      throw new AppError(`Mã cổng "${data.code}" đã tồn tại`, 409);
    }

    const gate = await prisma.gate.create({
      data: {
        name: data.name,
        code: data.code.toUpperCase(),
        type: data.type,
        zoneId: data.zoneId,
        status: data.status ?? 'ACTIVE',
      },
      include: {
        zone: {
          select: { id: true, name: true, floor: true },
        },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: actorId,
        action: 'CREATE',
        resource: 'Gate',
        resourceId: gate.id,
        newData: JSON.stringify(gate), // Đã Fix Stringify
      },
    });

    return gate;
  },

  async update(id: string, data: UpdateGateDto, actorId: string) {
    const existing = await prisma.gate.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('Không tìm thấy cổng', 404);
    }

    if (data.zoneId && data.zoneId !== existing.zoneId) {
      const newZone = await prisma.zone.findUnique({
        where: { id: data.zoneId },
      });
      if (!newZone) {
        throw new AppError('Khu vực mới không tồn tại', 404);
      }
    }

    if (data.status === 'INACTIVE' || data.status === 'MAINTENANCE') {
      const activeSessionCount = await prisma.parkingSession.count({
        where: {
          gateInId: id,
          status: 'ACTIVE',
        },
      });

      if (activeSessionCount > 0) {
        throw new AppError(
          `Cổng đang có ${activeSessionCount} xe đang sử dụng, không thể tắt`,
          400
        );
      }
    }

    const updated = await prisma.gate.update({
      where: { id },
      data,
      include: {
        zone: {
          select: { id: true, name: true, floor: true },
        },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: actorId,
        action: 'UPDATE',
        resource: 'Gate',
        resourceId: id,
        oldData: JSON.stringify(existing), // Đã Fix Stringify
        newData: JSON.stringify(updated), // Đã Fix Stringify
      },
    });

    return updated;
  },

  async getAvailableGates(type: 'ENTRY' | 'EXIT', zoneId?: string) {
    const where: Prisma.GateWhereInput = {
      status: 'ACTIVE',
      type: { in: [type, 'BOTH'] },
    };
    if (zoneId) where.zoneId = zoneId;

    return prisma.gate.findMany({
      where,
      include: {
        zone: {
          select: { id: true, name: true, floor: true },
        },
      },
      orderBy: [{ zone: { floor: 'asc' } }, { name: 'asc' }],
    });
  },
};