import { PrismaClient } from '@prisma/client';
import { AppError } from '../middlewares/error.middleware';

const prisma = new PrismaClient();

export interface CreatePaymentDto {
  sessionId: string;
  amount: number;
  paymentMethod: 'CASH' | 'QR' | 'CARD';
}

export const paymentService = {
  // --- 1. TẠO GIAO DỊCH THANH TOÁN (POST /api/payments) ---
  async createPayment(data: CreatePaymentDto) {
    // 1. Kiểm tra session có tồn tại và còn đang ACTIVE không
    const session = await prisma.session.findUnique({
      where: { id: data.sessionId },
      include: { slot: true }
    });

    if (!session) throw new AppError('Không tìm thấy phiên gửi xe', 404);
    if (session.status !== 'ACTIVE') throw new AppError('Phiên gửi xe này đã thanh toán hoặc kết thúc', 400);

    // Validate cơ bản: Số tiền không được âm
    if (data.amount <= 0) throw new AppError('Số tiền thanh toán không hợp lệ', 400);

    // 2. Dùng Transaction để chốt sổ 3 thao tác cùng lúc
    const result = await prisma.$transaction(async (tx) => {
      
      // a. Ghi nhận giao dịch thanh toán
      const newPayment = await tx.payment.create({
        data: {
          sessionId: data.sessionId,
          amount: data.amount,
          paymentMethod: data.paymentMethod,
          status: 'SUCCESS', // Trạng thái mặc định theo MVP
        }
      });

      // b. Cập nhật Session -> COMPLETED và ghi nhận giờ ra
      await tx.session.update({
        where: { id: data.sessionId },
        data: { 
          status: 'COMPLETED',
          exitTime: new Date(),
          totalFee: data.amount
        }
      });

      // c. Giải phóng Slot -> AVAILABLE
      if (session.slotId) {
        await tx.slot.update({
          where: { id: session.slotId },
          data: { status: 'AVAILABLE' }
        });
      }

      return newPayment;
    });

    return result;
  },

  // --- 2. LẤY THÔNG TIN THANH TOÁN THEO SESSION (GET /api/payments/:sessionId) ---
  async getPaymentBySessionId(sessionId: string) {
    const payment = await prisma.payment.findFirst({
      where: { sessionId: sessionId }
    });

    if (!payment) throw new AppError('Không tìm thấy dữ liệu thanh toán cho phiên này', 404);
    return payment;
  },

  // --- 3. TỔNG HỢP DOANH THU (GET /api/payments/summary) ---
  async getPaymentSummary() {
    // Group theo phương thức thanh toán và tính tổng tiền + số lượng giao dịch
    const summary = await prisma.payment.groupBy({
      by: ['paymentMethod'],
      _sum: {
        amount: true,
      },
      _count: {
        id: true,
      }
    });

    // Định dạng lại dữ liệu trả về cho đẹp
    return summary.map(item => ({
      paymentMethod: item.paymentMethod,
      totalAmount: item._sum.amount || 0,
      totalTransactions: item._count.id
    }));
  }
};