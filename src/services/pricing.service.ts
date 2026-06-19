import { Prisma } from '@prisma/client';
import { AppError } from '../middlewares/error.middleware';
import prisma from '../config/db';

export interface CreatePricingDto {
  vehicleTypeId: string;
  name: string;
  basePrice: number;
  pricePerHour: number;
  peakMultiplier?: number;
  overnightRate?: number;
  effectiveFrom: Date;
  effectiveTo?: Date;
}

export interface UpdatePricingDto {
  name?: string;
  basePrice?: number;
  pricePerHour?: number;
  peakMultiplier?: number;
  overnightRate?: number;
  effectiveFrom?: Date;
  effectiveTo?: Date;
  isActive?: boolean;
}

export interface CalculatePricingDto {
  vehicleTypeId: string;
  entryTime: Date;
  exitTime: Date;
  isPeakHour?: boolean;
  lostTicket?: boolean;
}

// Phụ thu mất vé — khớp LOST_TICKET_SURCHARGE phía FE (feeCalculator.ts)
export const LOST_TICKET_SURCHARGE = 50_000;

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
        overnightRate: data.overnightRate ?? 20000,
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

    const surcharge = data.lostTicket ? LOST_TICKET_SURCHARGE : 0;

    // Gửi xe qua đêm (> 12 giờ) → tính phí flat overnightRate, không tính theo giờ
    if (durationHours > 12) {
      const totalFee = pricing.overnightRate + surcharge;
      return {
        vehicleTypeId: data.vehicleTypeId,
        basePrice: pricing.basePrice,
        hourlyRate: 0,
        durationHours: parseFloat(durationHours.toFixed(2)),
        isOvernight: true,
        overnightRate: pricing.overnightRate,
        surcharge,
        totalFee: parseFloat(totalFee.toFixed(2)),
        isPeakHour: false,
      };
    }

    const hourlyRate = pricing.pricePerHour * (data.isPeakHour ? pricing.peakMultiplier || 1.5 : 1);
    const hourlyFee = hourlyRate * durationHours;
    const totalFee = pricing.basePrice + hourlyFee + surcharge;

    return {
      vehicleTypeId: data.vehicleTypeId,
      basePrice: pricing.basePrice,
      hourlyRate,
      durationHours: parseFloat(durationHours.toFixed(2)),
      isOvernight: false,
      overnightRate: pricing.overnightRate,
      surcharge,
      totalFee: parseFloat(totalFee.toFixed(2)),
      isPeakHour: data.isPeakHour || false,
    };
  },

  async isPeakHour(hour: number): Promise<boolean> {
    const peakHours = await pricingService.getPeakHoursRaw();
    return peakHours.includes(hour);
  },

  // Trả mảng giờ cao điểm thô (0-23), dùng cho cả isPeakHour() và route public /pricing/peak-hours
  async getPeakHoursRaw(): Promise<number[]> {
    const config = await prisma.systemConfig.findUnique({
      where: { key: 'PEAK_HOURS' },
    });

    const defaultHours = [7, 8, 9, 17, 18, 19];

    if (!config) return defaultHours;

    try {
      const peakHours = JSON.parse(config.value) as number[];
      return Array.isArray(peakHours) && peakHours.length > 0 ? peakHours : defaultHours;
    } catch {
      return defaultHours;
    }
  },

  // Format giống FE PeakHourRange — dùng cho route GET /pricing/peak-hours
  async getPeakHoursConfig() {
    const hours = await pricingService.getPeakHoursRaw();
    return {
      hours,
      ranges: groupConsecutiveHours(hours),
    };
  },
};

// Gom các giờ liên tiếp thành range dạng "07:00-09:00" để FE hiển thị
function groupConsecutiveHours(hours: number[]): Array<{ startTime: string; endTime: string }> {
  const sorted = [...hours].sort((a, b) => a - b);
  const ranges: Array<{ startTime: string; endTime: string }> = [];
  let start = sorted[0];
  let prev = sorted[0];

  const pad = (h: number) => String(h).padStart(2, '0') + ':00';

  for (let i = 1; i <= sorted.length; i++) {
    const cur = sorted[i];
    if (cur !== prev + 1) {
      ranges.push({ startTime: pad(start), endTime: pad(prev + 1) });
      start = cur;
    }
    prev = cur;
  }

  return ranges;
}
