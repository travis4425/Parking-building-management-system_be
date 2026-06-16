import { AppError } from '../middlewares/error.middleware';
import prisma from '../config/db';

export const exceptionService = {
  // 1. Xử lý mất thẻ xe
  async handleLostTicket(data: { licensePlate: string; description?: string }) {
    // Tìm xe đang trong bãi thông qua biển số
    const session = await prisma.session.findFirst({
      where: { 
        licensePlate: data.licensePlate, 
        status: 'ACTIVE' 
      }
    });

    if (!session) throw new AppError('Không tìm thấy xe có biển số này đang trong bãi', 404);

    // Lấy phí phạt từ file .env, nếu không có thì mặc định là 10.000đ
    const fee = parseInt(process.env.LOST_TICKET_FEE || '10000', 10);

    // Ghi nhận ngoại lệ
    const exception = await prisma.exception.create({
      data: {
        sessionId: session.id,
        type: 'LOST_TICKET',
        description: data.description || 'Khách báo mất thẻ xe',
        extraFee: fee,
      }
    });

    return exception;
  },

  // 2. Xử lý sửa biển số bị sai
  async handleWrongPlate(data: { sessionId: string; newLicensePlate: string; userId: string; description?: string }) {
    const session = await prisma.session.findUnique({
      where: { id: data.sessionId }
    });

    if (!session) throw new AppError('Không tìm thấy phiên gửi xe', 404);

    const oldPlate = session.licensePlate;

    // Dùng Transaction để vừa sửa Session, vừa ghi Exception, vừa tạo AuditLog
    const result = await prisma.$transaction(async (tx) => {
      // a. Cập nhật lại biển số mới cho Session
      await tx.session.update({
        where: { id: data.sessionId },
        data: { licensePlate: data.newLicensePlate }
      });

      // b. Ghi nhận ngoại lệ
      const exception = await tx.exception.create({
        data: {
          sessionId: data.sessionId,
          type: 'WRONG_PLATE',
          oldLicensePlate: oldPlate,
          newLicensePlate: data.newLicensePlate,
          description: data.description || 'Sửa biển số do nhập sai lúc vào',
        }
      });

      // c. Ghi log kiểm toán (AuditLog) để truy vết ai là người sửa
      await tx.auditLog.create({
        data: {
          userId: data.userId,
          action: 'UPDATE_LICENSE_PLATE',
          resource: 'Session',
          resourceId: data.sessionId,
          oldData: oldPlate,
          newData: data.newLicensePlate,
        }
      });

      return exception;
    });

    return result;
  },

  // 3. Xử lý xe đỗ sai khu vực
  async handleWrongZone(data: { sessionId: string; description?: string }) {
    const exception = await prisma.exception.create({
      data: {
        sessionId: data.sessionId,
        type: 'WRONG_ZONE',
        description: data.description || 'Xe đỗ sai khu vực quy định',
      }
    });

    return exception;
  },

  // 4. Lấy danh sách các ngoại lệ đã xử lý
  async getAllExceptions() {
    return await prisma.exception.findMany({
      include: {
        session: {
          select: { licensePlate: true, qrToken: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }
};