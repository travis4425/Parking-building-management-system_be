import { Prisma } from '@prisma/client';
import { AppError } from '../middlewares/error.middleware';
import prisma from '../config/db';

export interface CreateAlertDto {
  type: 'SENSOR_ERROR' | 'SESSION_OVERTIME' | 'WRONG_ZONE';
  slotId?: string;
  message: string;
}

export interface AlertQueryDto {
  status?: string;
  type?: string;
  slotId?: string;
  page?: number;
  limit?: number;
}

export const alertService = {
  async getAll(query: AlertQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const where: Prisma.AlertWhereInput = {};
    if (query.status) where.status = query.status.toUpperCase() as any;
    if (query.type) where.type = query.type.toUpperCase() as any;
    if (query.slotId) where.slotId = query.slotId;

    const [data, total] = await Promise.all([
      prisma.alert.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { slot: { select: { code: true } } },
      }),
      prisma.alert.count({ where }),
    ]);

    return {
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  },

  async getById(id: string) {
    const alert = await prisma.alert.findUnique({
      where: { id },
      include: { slot: { select: { code: true } } },
    });

    if (!alert) throw new AppError('Không tìm thấy cảnh báo', 404);

    return alert;
  },

  async create(data: CreateAlertDto) {
    return prisma.alert.create({
      data: {
        type: data.type,
        slotId: data.slotId,
        message: data.message,
      },
      include: { slot: { select: { code: true } } },
    });
  },

  async resolve(id: string) {
    const alert = await prisma.alert.findUnique({ where: { id } });
    if (!alert) throw new AppError('Không tìm thấy cảnh báo', 404);

    return prisma.alert.update({
      where: { id },
      data: { status: 'RESOLVED' },
    });
  },

  async delete(id: string) {
    const alert = await prisma.alert.findUnique({ where: { id } });
    if (!alert) throw new AppError('Không tìm thấy cảnh báo', 404);

    return prisma.alert.delete({ where: { id } });
  },
};
