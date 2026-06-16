import { Prisma } from '@prisma/client';
import { AppError } from '../middlewares/error.middleware';
import prisma from '../config/db';

export interface CreateVehicleTypeDto {
  name: string;
  code: string;
  description?: string;
  maxHeight?: number;
  maxWidth?: number;
}

export interface UpdateVehicleTypeDto {
  name?: string;
  code?: string;
  description?: string;
  maxHeight?: number;
  maxWidth?: number;
}

export const vehicleTypeService = {
  async getAll(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      prisma.vehicleType.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          zoneVehicleRules: {
            include: { zone: { select: { id: true, name: true, floor: true } } },
          },
        },
      }),
      prisma.vehicleType.count(),
    ]);

    return {
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  },

  async getById(id: string) {
    const vehicleType = await prisma.vehicleType.findUnique({
      where: { id },
      include: {
        zoneVehicleRules: {
          include: { zone: { select: { id: true, name: true, floor: true } } },
        },
        pricePolicies: {
          where: { isActive: true },
          orderBy: { effectiveFrom: 'desc' },
        },
      },
    });

    if (!vehicleType) {
      throw new AppError('Vehicle type not found', 404);
    }

    return vehicleType;
  },

  async create(data: CreateVehicleTypeDto) {
    // Check if code already exists
    const existing = await prisma.vehicleType.findFirst({
      where: { code: data.code.toUpperCase() },
    });

    if (existing) {
      throw new AppError('Vehicle type code already exists', 409);
    }

    return prisma.vehicleType.create({
      data: {
        ...data,
        code: data.code.toUpperCase(),
      },
    });
  },

  async update(id: string, data: UpdateVehicleTypeDto) {
    const vehicleType = await prisma.vehicleType.findUnique({ where: { id } });

    if (!vehicleType) {
      throw new AppError('Vehicle type not found', 404);
    }

    // Check if new code already exists (if provided and different)
    if (data.code && data.code.toUpperCase() !== vehicleType.code) {
      const existing = await prisma.vehicleType.findFirst({
        where: { code: data.code.toUpperCase() },
      });
      if (existing) {
        throw new AppError('Vehicle type code already exists', 409);
      }
    }

    return prisma.vehicleType.update({
      where: { id },
      data: {
        ...data,
        ...(data.code && { code: data.code.toUpperCase() }),
      },
    });
  },

  async delete(id: string) {
    const vehicleType = await prisma.vehicleType.findUnique({ where: { id } });

    if (!vehicleType) {
      throw new AppError('Vehicle type not found', 404);
    }

    return prisma.vehicleType.delete({ where: { id } });
  },

  async getZoneVehicleRules(zoneId?: string, vehicleTypeId?: string) {
    const where: Prisma.ZoneVehicleRuleWhereInput = {};
    if (zoneId) where.zoneId = zoneId;
    if (vehicleTypeId) where.vehicleTypeId = vehicleTypeId;

    return prisma.zoneVehicleRule.findMany({
      where,
      include: {
        zone: { select: { id: true, name: true, floor: true, capacity: true } },
        vehicleType: { select: { id: true, name: true, code: true } },
      },
      orderBy: [{ zone: { floor: 'asc' } }, { vehicleType: { name: 'asc' } }],
    });
  },

  async createZoneVehicleRule(zoneId: string, vehicleTypeId: string) {
    // Validate both zone and vehicle type exist
    const [zone, vehicleType] = await Promise.all([
      prisma.zone.findUnique({ where: { id: zoneId } }),
      prisma.vehicleType.findUnique({ where: { id: vehicleTypeId } }),
    ]);

    if (!zone) {
      throw new AppError('Zone not found', 404);
    }
    if (!vehicleType) {
      throw new AppError('Vehicle type not found', 404);
    }

    // Check if rule already exists
    const existing = await prisma.zoneVehicleRule.findUnique({
      where: { zoneId_vehicleTypeId: { zoneId, vehicleTypeId } },
    });

    if (existing) {
      throw new AppError('Zone vehicle rule already exists', 409);
    }

    return prisma.zoneVehicleRule.create({
      data: { zoneId, vehicleTypeId },
      include: {
        zone: { select: { id: true, name: true, floor: true } },
        vehicleType: { select: { id: true, name: true, code: true } },
      },
    });
  },

  async deleteZoneVehicleRule(zoneId: string, vehicleTypeId: string) {
    const rule = await prisma.zoneVehicleRule.findUnique({
      where: { zoneId_vehicleTypeId: { zoneId, vehicleTypeId } },
    });

    if (!rule) {
      throw new AppError('Zone vehicle rule not found', 404);
    }

    return prisma.zoneVehicleRule.delete({
      where: { zoneId_vehicleTypeId: { zoneId, vehicleTypeId } },
    });
  },
};
