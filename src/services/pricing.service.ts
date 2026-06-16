import { PrismaClient, Prisma } from '@prisma/client';
import { AppError } from '../middlewares/error.middleware';

const prisma = new PrismaClient({});

export interface CreatePricingDto {
  vehicleTypeId: string;
  name: string;
  basePrice: number;
  pricePerHour: number;
  peakMultiplier?: number;
  effectiveFrom: Date;
  effectiveTo?: Date;
}

export interface UpdatePricingDto {
  name?: string;
  basePrice?: number;
  pricePerHour?: number;
  peakMultiplier?: number;
  effectiveFrom?: Date;
  effectiveTo?: Date;
  isActive?: boolean;
}

export interface CalculatePricingDto {
  vehicleTypeId: string;
  entryTime: Date;
  exitTime: Date;
  isPeakHour?: boolean;
}

export const pricingService = {
  async getAll(vehicleTypeId?: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const where: Prisma.PricePolicyWhereInput = {};

    if (vehicleTypeId) where.vehicleTypeId = vehicleTypeId;

    const [data, total] = await Promise.all([
      prisma.pricePolicy.findMany({
        where,
        skip,
        take: limit,
        include: { vehicleType: { select: { id: true, name: true, code: true } } },
        orderBy: { effectiveFrom: 'desc' },
      }),
      prisma.pricePolicy.count({ where }),
    ]);

    return {
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  },

  async getActive(vehicleTypeId?: string) {
    const where: Prisma.PricePolicyWhereInput = {
      isActive: true,
      effectiveFrom: { lte: new Date() },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: new Date() } }],
    };

    if (vehicleTypeId) where.vehicleTypeId = vehicleTypeId;

    return prisma.pricePolicy.findMany({
      where,
      include: { vehicleType: { select: { id: true, name: true, code: true } } },
      orderBy: [{ vehicleTypeId: 'asc' }, { effectiveFrom: 'desc' }],
    });
  },

  async getById(id: string) {
    const pricing = await prisma.pricePolicy.findUnique({
      where: { id },
      include: { vehicleType: { select: { id: true, name: true, code: true } } },
    });

    if (!pricing) {
      throw new AppError('Pricing policy not found', 404);
    }

    return pricing;
  },

  async create(data: CreatePricingDto) {
    // Validate vehicle type exists
    const vehicleType = await prisma.vehicleType.findUnique({
      where: { id: data.vehicleTypeId },
    });

    if (!vehicleType) {
      throw new AppError('Vehicle type not found', 404);
    }

    // Deactivate overlapping policies
    if (data.effectiveFrom) {
      await prisma.pricePolicy.updateMany({
        where: {
          vehicleTypeId: data.vehicleTypeId,
          isActive: true,
          effectiveFrom: { lt: data.effectiveFrom },
          OR: [
            { effectiveTo: null },
            { effectiveTo: { gte: data.effectiveFrom } },
          ],
        },
        data: { isActive: false },
      });
    }

    return prisma.pricePolicy.create({
      data: {
        ...data,
        peakMultiplier: data.peakMultiplier || 1.5,
      },
      include: { vehicleType: { select: { id: true, name: true, code: true } } },
    });
  },

  async update(id: string, data: UpdatePricingDto) {
    const pricing = await prisma.pricePolicy.findUnique({ where: { id } });

    if (!pricing) {
      throw new AppError('Pricing policy not found', 404);
    }

    return prisma.pricePolicy.update({
      where: { id },
      data,
      include: { vehicleType: { select: { id: true, name: true, code: true } } },
    });
  },

  async delete(id: string) {
    const pricing = await prisma.pricePolicy.findUnique({ where: { id } });

    if (!pricing) {
      throw new AppError('Pricing policy not found', 404);
    }

    return prisma.pricePolicy.delete({ where: { id } });
  },

  async calculatePrice(data: CalculatePricingDto) {
    // Get active pricing for vehicle type
    const pricing = await prisma.pricePolicy.findFirst({
      where: {
        vehicleTypeId: data.vehicleTypeId,
        isActive: true,
        effectiveFrom: { lte: new Date(data.entryTime) },
        OR: [
          { effectiveTo: null },
          { effectiveTo: { gte: new Date(data.exitTime) } },
        ],
      },
    });

    if (!pricing) {
      throw new AppError('No active pricing policy for this vehicle type', 404);
    }

    const entryTime = new Date(data.entryTime);
    const exitTime = new Date(data.exitTime);
    const durationMs = exitTime.getTime() - entryTime.getTime();
    const durationHours = durationMs / (1000 * 60 * 60);

    if (durationHours <= 0) {
      throw new AppError('Exit time must be after entry time', 400);
    }

    const hourlyRate = pricing.pricePerHour * (data.isPeakHour ? pricing.peakMultiplier || 1.5 : 1);
    const hourlyFee = hourlyRate * durationHours;
    const totalFee = pricing.basePrice + hourlyFee;

    return {
      vehicleTypeId: data.vehicleTypeId,
      basePrice: pricing.basePrice,
      hourlyRate,
      durationHours: parseFloat(durationHours.toFixed(2)),
      totalFee: parseFloat(totalFee.toFixed(2)),
      isPeakHour: data.isPeakHour || false,
    };
  },

  async isPeakHour(hour: number): Promise<boolean> {
    // Get peak hours config
    const config = await prisma.systemConfig.findUnique({
      where: { key: 'PEAK_HOURS' },
    });

    if (!config) {
      // Default peak hours: 7-9 AM and 5-7 PM
      return (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19);
    }

    try {
      const peakHours = JSON.parse(config.value) as number[];
      return peakHours.includes(hour);
    } catch {
      // Default if config is invalid
      return (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19);
    }
  },
};
