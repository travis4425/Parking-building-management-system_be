import { PrismaClient, Prisma, Role } from '@prisma/client';
import { AppError } from '../middlewares/error.middleware';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient({});

export interface CreateUserDto {
  email: string;
  password?: string;
  fullName: string;
  phone?: string;
  role?: Role;
}

export interface UpdateUserDto {
  fullName?: string;
  email?: string;
  phone?: string;
}

export const adminService = {
  // ─── USER MANAGEMENT ──────────────────────────────────────────────────────
  async getAllUsers(role?: string, status?: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const where: Prisma.UserWhereInput = {};

    if (role) where.role = role as Role;
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          fullName: true,
          phone: true,
          role: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  },

  async getUserById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    return user;
  },

  async createUser(data: CreateUserDto) {
    // Check if email exists
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      throw new AppError('Email already exists', 409);
    }

    // Hash password if provided
    let hashedPassword = null;
    if (data.password) {
      hashedPassword = await bcrypt.hash(data.password, 10);
    }

    return prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        fullName: data.fullName,
        phone: data.phone,
        role: data.role || Role.DRIVER,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });
  },

  async updateUser(id: string, data: UpdateUserDto) {
    const user = await prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Check if new email already exists
    if (data.email && data.email !== user.email) {
      const existing = await prisma.user.findUnique({ where: { email: data.email } });
      if (existing) {
        throw new AppError('Email already exists', 409);
      }
    }

    return prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        status: true,
        updatedAt: true,
      },
    });
  },

  async updateUserRole(id: string, role: Role) {
    const user = await prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    return prisma.user.update({
      where: { id },
      data: { role },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        status: true,
        updatedAt: true,
      },
    });
  },

  async updateUserStatus(id: string, status: string) {
    const user = await prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    return prisma.user.update({
      where: { id },
      data: { status },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        status: true,
        updatedAt: true,
      },
    });
  },

  // ─── AUDIT LOGS ────────────────────────────────────────────────────────────
  async getAuditLogs(
    userId?: string,
    action?: string,
    resource?: string,
    startDate?: Date,
    endDate?: Date,
    page: number = 1,
    limit: number = 20
  ) {
    const skip = (page - 1) * limit;
    const where: Prisma.AuditLogWhereInput = {};

    if (userId) where.userId = userId;
    if (action) where.action = action;
    if (resource) where.resource = resource;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt!.gte = startDate;
      if (endDate) where.createdAt!.lte = endDate;
    }

    const [data, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  },

  async logAction(
    userId: string,
    action: string,
    resource: string,
    resourceId?: string,
    oldData?: string,
    newData?: string,
    ipAddress?: string
  ) {
    return prisma.auditLog.create({
      data: {
        userId,
        action,
        resource,
        resourceId,
        oldData,
        newData,
        ipAddress,
      },
    });
  },

  // ─── SYSTEM CONFIG ───────────────────────────────────────────────────────────
  async getSystemConfig() {
    return prisma.systemConfig.findMany({
      orderBy: { key: 'asc' },
    });
  },

  async getConfigByKey(key: string) {
    const config = await prisma.systemConfig.findUnique({
      where: { key },
    });

    if (!config) {
      throw new AppError('Configuration not found', 404);
    }

    return config;
  },

  async setSystemConfig(key: string, value: string, description?: string, type?: string) {
    const existing = await prisma.systemConfig.findUnique({ where: { key } });

    if (existing) {
      return prisma.systemConfig.update({
        where: { key },
        data: { value, description, type },
      });
    }

    return prisma.systemConfig.create({
      data: { key, value, description, type: type || 'string' },
    });
  },

  async updateSystemConfig(key: string, data: { value?: string; description?: string; type?: string }) {
    const existing = await prisma.systemConfig.findUnique({ where: { key } });

    if (!existing) {
      throw new AppError('Configuration not found', 404);
    }

    return prisma.systemConfig.update({
      where: { key },
      data,
    });
  },

  async deleteSystemConfig(key: string) {
    const existing = await prisma.systemConfig.findUnique({ where: { key } });

    if (!existing) {
      throw new AppError('Configuration not found', 404);
    }

    return prisma.systemConfig.delete({ where: { key } });
  },
};
