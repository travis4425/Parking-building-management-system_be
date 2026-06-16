import { AppError } from '../middlewares/error.middleware';
import prisma from '../config/db';

export const reportsService = {
  async getRevenue(period: 'day' | 'week' | 'month' = 'day', startDate?: Date, endDate?: Date) {
    const start = startDate || new Date();
    const end = endDate || new Date();

    if (period === 'day') {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (period === 'week') {
      const day = start.getDay();
      const diff = start.getDate() - day;
      start.setDate(diff);
      start.setHours(0, 0, 0, 0);
      end.setDate(diff + 7);
      end.setHours(23, 59, 59, 999);
    } else if (period === 'month') {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(end.getMonth() + 1);
      end.setDate(0);
      end.setHours(23, 59, 59, 999);
    }

    const data = await prisma.session.groupBy({
      by: ['zoneId'],
      where: {
        status: 'COMPLETED',
        exitTime: {
          gte: start,
          lte: end,
        },
      },
      _sum: { totalFee: true },
      _count: { id: true },
    });

    const zones = await prisma.zone.findMany({
      select: { id: true, name: true, floor: true },
    });

    const zoneMap = new Map(zones.map(z => [z.id, z]));

    const result = data.map(item => ({
      zone: zoneMap.get(item.zoneId),
      totalSessions: item._count.id,
      totalRevenue: item._sum.totalFee || 0,
    }));

    const totalRevenue = result.reduce((sum, item) => sum + item.totalRevenue, 0);
    const totalSessions = result.reduce((sum, item) => sum + item.totalSessions, 0);

    return {
      period,
      startDate: start,
      endDate: end,
      totalRevenue,
      totalSessions,
      byZone: result,
    };
  },

  async getTraffic(startDate?: Date, endDate?: Date) {
    const start = startDate || new Date();
    const end = endDate || new Date();
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    const data = await prisma.$queryRaw<any[]>`
      SELECT 
        EXTRACT(HOUR FROM "entryTime") as hour,
        COUNT(*) as count
      FROM "sessions"
      WHERE "entryTime" >= $1::timestamp
        AND "entryTime" <= $2::timestamp
      GROUP BY EXTRACT(HOUR FROM "entryTime")
      ORDER BY hour ASC
    `;

    const hourly = Array.from({ length: 24 }, (_, i) => {
      const item = data.find(d => d.hour === i);
      return {
        hour: i,
        count: item?.count || 0,
      };
    });

    return {
      startDate: start,
      endDate: end,
      hourly,
      totalVehicles: hourly.reduce((sum, item) => sum + item.count, 0),
    };
  },

  async getOccupancy(startDate?: Date, endDate?: Date) {
    const start = startDate || new Date();
    const end = endDate || new Date();
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    const data = await prisma.zone.findMany({
      select: { id: true, name: true, floor: true, capacity: true },
      orderBy: { floor: 'asc' },
    });

    const occupancy = await Promise.all(
      data.map(async zone => {
        const activeSessions = await prisma.session.count({
          where: {
            zoneId: zone.id,
            status: 'ACTIVE',
            entryTime: { lte: end },
            OR: [{ exitTime: null }, { exitTime: { gte: start } }],
          },
        });

        return {
          zone: { id: zone.id, name: zone.name, floor: zone.floor },
          occupiedSlots: activeSessions,
          totalCapacity: zone.capacity,
          occupancyRate: parseFloat(((activeSessions / zone.capacity) * 100).toFixed(2)),
        };
      })
    );

    return {
      startDate: start,
      endDate: end,
      byZone: occupancy,
      averageOccupancy: parseFloat(
        (occupancy.reduce((sum, z) => sum + z.occupancyRate, 0) / occupancy.length).toFixed(2)
      ),
    };
  },

  async getVehicleTypeDistribution(startDate?: Date, endDate?: Date) {
    const start = startDate || new Date();
    const end = endDate || new Date();
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    const data = await prisma.session.groupBy({
      by: ['vehicleTypeId'],
      where: {
        entryTime: { gte: start, lte: end },
      },
      _count: { id: true },
    });

    const vehicleTypes = await prisma.vehicleType.findMany({
      select: { id: true, name: true, code: true },
    });

    const typeMap = new Map(vehicleTypes.map(vt => [vt.id, vt]));
    const totalVehicles = data.reduce((sum, item) => sum + item._count.id, 0);

    const result = data.map(item => ({
      vehicleType: typeMap.get(item.vehicleTypeId),
      count: item._count.id,
      percentage: parseFloat(((item._count.id / totalVehicles) * 100).toFixed(2)),
    }));

    return {
      startDate: start,
      endDate: end,
      totalVehicles,
      byVehicleType: result,
    };
  },

  async getPeakHours(startDate?: Date, endDate?: Date) {
    const start = startDate || new Date();
    const end = endDate || new Date();
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    const data = await prisma.$queryRaw<any[]>`
      SELECT 
        EXTRACT(HOUR FROM "entryTime") as hour,
        COUNT(*) as entries,
        COUNT(CASE WHEN "exitTime" IS NOT NULL THEN 1 END) as exits
      FROM "sessions"
      WHERE "entryTime" >= $1::timestamp
        AND "entryTime" <= $2::timestamp
      GROUP BY EXTRACT(HOUR FROM "entryTime")
      ORDER BY hour ASC
    `;

    const hourly = Array.from({ length: 24 }, (_, i) => {
      const item = data.find(d => d.hour === i);
      return {
        hour: i,
        entries: item?.entries || 0,
        exits: item?.exits || 0,
        active: (item?.entries || 0) - (item?.exits || 0),
      };
    });

    // Find peak hours (top 4 hours with most entries)
    const sorted = [...hourly].sort((a, b) => b.entries - a.entries);
    const peakHours = sorted.slice(0, 4).map(h => h.hour).sort((a, b) => a - b);

    return {
      startDate: start,
      endDate: end,
      hourly,
      peakHours,
      statistics: {
        totalEntries: data.reduce((sum, item) => sum + item.entries, 0),
        totalExits: data.reduce((sum, item) => sum + item.exits, 0),
        averageHourlyTraffic: parseFloat(
          (data.reduce((sum, item) => sum + item.entries, 0) / 24).toFixed(2)
        ),
      },
    };
  },
};
