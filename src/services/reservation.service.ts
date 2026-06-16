import { PrismaClient, Prisma } from '@prisma/client';
import { AppError } from '../middlewares/error.middleware';

const prisma = new PrismaClient();

export interface CreateReservationDto {
  userId: string;
  vehicleTypeId: string;
  zoneId: string;
  startTime: Date;
  duration: number; // in minutes
}

export interface UpdateReservationDto {
  startTime?: Date;
  endTime?: Date;
  status?: string;
}

export const reservationService = {
  async getAll(userId?: string, status?: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const where: Prisma.ReservationWhereInput = {};

    if (userId) where.userId = userId;
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      prisma.reservation.findMany({
        where,
        skip,
        take: limit,
        include: {
          vehicleType: { select: { id: true, name: true, code: true } },
          zone: { select: { id: true, name: true, floor: true } },
        },
        orderBy: { startTime: 'desc' },
      }),
      prisma.reservation.count({ where }),
    ]);

    return {
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  },

  async getById(id: string) {
    const reservation = await prisma.reservation.findUnique({
      where: { id },
      include: {
        vehicleType: { select: { id: true, name: true, code: true } },
        zone: { select: { id: true, name: true, floor: true } },
        sessions: {
          select: { id: true, qrToken: true, status: true, totalFee: true },
        },
      },
    });

    if (!reservation) {
      throw new AppError('Reservation not found', 404);
    }

    return reservation;
  },

  async getByUserId(userId: string, page: number = 1, limit: number = 20) {
    return this.getAll(userId, undefined, page, limit);
  },

  async getActive(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const now = new Date();

    const [data, total] = await Promise.all([
      prisma.reservation.findMany({
        where: {
          status: 'ACTIVE',
          endTime: { gte: now },
        },
        skip,
        take: limit,
        include: {
          vehicleType: { select: { id: true, name: true, code: true } },
          zone: { select: { id: true, name: true, floor: true } },
        },
        orderBy: { startTime: 'asc' },
      }),
      prisma.reservation.count({
        where: { status: 'ACTIVE', endTime: { gte: now } },
      }),
    ]);

    return {
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  },

  async create(data: CreateReservationDto) {
    // Validate zone and vehicle type
    const [zone, vehicleType] = await Promise.all([
      prisma.zone.findUnique({ where: { id: data.zoneId } }),
      prisma.vehicleType.findUnique({ where: { id: data.vehicleTypeId } }),
    ]);

    if (!zone) {
      throw new AppError('Zone not found', 404);
    }
    if (!vehicleType) {
      throw new AppError('Vehicle type not found', 404);
    }

    // Check if vehicle type is allowed in this zone
    const rule = await prisma.zoneVehicleRule.findUnique({
      where: { zoneId_vehicleTypeId: { zoneId: data.zoneId, vehicleTypeId: data.vehicleTypeId } },
    });

    if (!rule) {
      throw new AppError('Vehicle type not allowed in this zone', 403);
    }

    // Calculate end time
    const endTime = new Date(data.startTime);
    endTime.setMinutes(endTime.getMinutes() + data.duration);

    // Check for overlapping active reservations
    const overlap = await prisma.reservation.findFirst({
      where: {
        userId: data.userId,
        zoneId: data.zoneId,
        status: 'ACTIVE',
        OR: [
          {
            startTime: { lt: endTime },
            endTime: { gt: data.startTime },
          },
        ],
      },
    });

    if (overlap) {
      throw new AppError('Overlapping reservation exists', 409);
    }

    return prisma.reservation.create({
      data: {
        userId: data.userId,
        vehicleTypeId: data.vehicleTypeId,
        zoneId: data.zoneId,
        startTime: data.startTime,
        endTime,
        status: 'ACTIVE',
      },
      include: {
        vehicleType: { select: { id: true, name: true, code: true } },
        zone: { select: { id: true, name: true, floor: true } },
      },
    });
  },

  async update(id: string, data: UpdateReservationDto) {
    const reservation = await prisma.reservation.findUnique({ where: { id } });

    if (!reservation) {
      throw new AppError('Reservation not found', 404);
    }

    return prisma.reservation.update({
      where: { id },
      data,
      include: {
        vehicleType: { select: { id: true, name: true, code: true } },
        zone: { select: { id: true, name: true, floor: true } },
      },
    });
  },

  async cancel(id: string) {
    const reservation = await prisma.reservation.findUnique({ where: { id } });

    if (!reservation) {
      throw new AppError('Reservation not found', 404);
    }

    if (reservation.status !== 'ACTIVE') {
      throw new AppError('Can only cancel active reservations', 400);
    }

    return prisma.reservation.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
      },
      include: {
        vehicleType: { select: { id: true, name: true, code: true } },
        zone: { select: { id: true, name: true, floor: true } },
      },
    });
  },

  async autoCancelExpired(): Promise<number> {
    // Auto-cancel reservations that haven't checked in within 15 minutes of start time
    const fifteenMinutesAgo = new Date();
    fifteenMinutesAgo.setMinutes(fifteenMinutesAgo.getMinutes() - 15);

    const result = await prisma.reservation.updateMany({
      where: {
        status: 'ACTIVE',
        startTime: { lte: fifteenMinutesAgo },
        sessions: { none: {} }, // No check-in yet
      },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
      },
    });

    return result.count;
  },
};
