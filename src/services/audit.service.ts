// import { PrismaClient } from '@prisma/client';
import prisma from '../config/db';

// const prisma = new PrismaClient({});

export const logAudit = async (
  userId: string,
  action: string,
  resource: string,
  resourceId?: string,
  oldData?: any,
  newData?: any,
  ipAddress?: string
) => {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        resource,
        resourceId,
        oldData: oldData ? JSON.stringify(oldData) : null,
        newData: newData ? JSON.stringify(newData) : null,
        ipAddress: ipAddress || 'Unknown',
      },
    });
  } catch (error) {
    console.error('⚠️ [AuditLog Error]: Không thể ghi log thao tác', error);
  }
};