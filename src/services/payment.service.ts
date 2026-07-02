import { AppError } from '../middlewares/error.middleware';
import prisma from '../config/db';
import crypto from 'crypto';
import qs from 'qs';
import { sortObject, formatDateTime } from '../utils/vnpay.util';

export interface CreatePaymentDto {
  sessionId: string;
  amount: number;
  paymentMethod: 'CASH' | 'QR' | 'CARD';
}

export const paymentService = {
  // =====================================================================
  // LUỒNG 1: THANH TOÁN TIỀN MẶT / THỦ CÔNG (Đóng ca ngay lập tức)
  // =====================================================================
  async createPayment(data: CreatePaymentDto) {
    const session = await prisma.session.findUnique({
      where: { id: data.sessionId },
      include: { slot: true }
    });

    if (!session) throw new AppError('Không tìm thấy phiên gửi xe', 404);
    if (!['ACTIVE', 'PAYMENT_PENDING'].includes(session.status)) {
      throw new AppError('Phiên gửi xe này đã thanh toán hoặc kết thúc', 400);
    }
    if (data.amount <= 0) throw new AppError('Số tiền thanh toán không hợp lệ', 400);
    if (session.totalFee != null && data.amount !== session.totalFee) {
      throw new AppError('Số tiền thanh toán không khớp với phí gửi xe', 400);
    }

    const result = await prisma.$transaction(async (tx) => {
      const newPayment = await tx.payment.create({
        data: {
          sessionId: data.sessionId,
          amount: data.amount,
          paymentMethod: data.paymentMethod,
          status: 'SUCCESS',
        }
      });

      await tx.session.update({
        where: { id: data.sessionId },
        data: { 
          status: 'COMPLETED',
          exitTime: new Date(),
          totalFee: data.amount
        }
      });

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

  // =====================================================================
  // LUỒNG 2: THANH TOÁN VNPAY (Tạo URL chờ quét mã)
  // =====================================================================
  async createPaymentUrl(sessionId: string, amount: number, ipAddr: string) {
    const session = await prisma.session.findUnique({ where: { id: sessionId } });
    if (!session) throw new AppError('Không tìm thấy phiên gửi xe', 404);
    if (!['ACTIVE', 'PAYMENT_PENDING'].includes(session.status)) {
      throw new AppError('Phiên này không thể thanh toán', 400);
    }
    if (session.totalFee != null && amount !== session.totalFee) {
      throw new AppError('Số tiền thanh toán không khớp với phí gửi xe', 400);
    }

    const tmnCode = process.env.VNP_TMN_CODE!;
    const secretKey = process.env.VNP_HASH_SECRET!;
    const vnpUrl = process.env.VNP_URL!;
    const returnUrl = process.env.VNP_RETURN_URL!;

    // Không sinh QR/link trông có vẻ hợp lệ khi merchant credential vẫn là
    // placeholder. VNPay yêu cầu TmnCode đúng 8 ký tự chữ/số.
    if (!/^[A-Za-z0-9]{8}$/.test(tmnCode ?? '')) {
      throw new AppError('VNPay chưa được cấu hình: VNP_TMN_CODE không hợp lệ', 503);
    }
    if (!secretKey || secretKey.length < 16) {
      throw new AppError('VNPay chưa được cấu hình: thiếu VNP_HASH_SECRET', 503);
    }
    try {
      new URL(vnpUrl);
      new URL(returnUrl);
    } catch {
      throw new AppError('VNPay chưa được cấu hình: URL thanh toán/return không hợp lệ', 503);
    }

    const date = new Date();
    const createDate = formatDateTime(date);
    
    // 🔥 SỬA: Lấy FULL sessionId để orderId không bao giờ bị trùng
    const orderId = `${formatDateTime(date)}_${sessionId}`; 

    // 🐞 SỬA: trước đây gắn nhầm paymentMethod: 'CARD' cho luồng VNPay/QR (máy QR + loa
    // theo kiến trúc mới), khiến báo cáo doanh thu theo phương thức (getPaymentSummary,
    // group by paymentMethod) thống kê sai — toàn bộ giao dịch QR bị tính nhầm vào CARD.
    await prisma.payment.upsert({
      where: { sessionId: sessionId },
      update: { amount, status: 'PENDING', paymentMethod: 'QR' },
      create: { sessionId, amount, status: 'PENDING', paymentMethod: 'QR' }
    });

    let vnp_Params: any = {
      'vnp_Version': '2.1.0',
      'vnp_Command': 'pay',
      'vnp_TmnCode': tmnCode,
      'vnp_Locale': 'vn',
      'vnp_CurrCode': 'VND',
      // Merchant sandbox trả MBAPP là phương thức Mobile Banking/VNPAY-QR.
      // Chọn sẵn để luồng QR đi thẳng tới màn hình quét thay vì trang chọn thẻ/ngân hàng.
      'vnp_BankCode': 'MBAPP',
      'vnp_TxnRef': orderId,
      'vnp_OrderInfo': `Thanh toan ve xe cho session ${sessionId}`,
      'vnp_OrderType': 'other',
      'vnp_Amount': amount * 100, 
      'vnp_ReturnUrl': returnUrl,
      'vnp_IpAddr': ipAddr,
      'vnp_CreateDate': createDate,
    };

    vnp_Params = sortObject(vnp_Params);
    const signData = qs.stringify(vnp_Params, { encode: false });
    const hmac = crypto.createHmac('sha512', secretKey);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');
    vnp_Params['vnp_SecureHash'] = signed;

    return vnpUrl + '?' + qs.stringify(vnp_Params, { encode: false });
  },

  // =====================================================================
  // LUỒNG 3: VNPAY IPN (Hệ thống VNPay tự động gọi về báo kết quả)
  // =====================================================================
  async vnpayIpn(vnp_Params: any) {
    const secureHash = vnp_Params['vnp_SecureHash'];
    delete vnp_Params['vnp_SecureHash'];
    delete vnp_Params['vnp_SecureHashType'];

    vnp_Params = sortObject(vnp_Params);
    const secretKey = process.env.VNP_HASH_SECRET!;
    const signData = qs.stringify(vnp_Params, { encode: false });
    const hmac = crypto.createHmac('sha512', secretKey);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    if (secureHash === signed) {
      const orderId = vnp_Params['vnp_TxnRef'];
      const rspCode = vnp_Params['vnp_ResponseCode'];
      
      // 🔥 SỬA: Tách lấy chính xác FULL sessionId phía sau dấu "_"
      const exactSessionId = orderId.substring(orderId.indexOf('_') + 1); 

      // 🔥 SỬA: Tìm chính xác 100% sessionId (không dùng startsWith)
      const payment = await prisma.payment.findFirst({
        where: { sessionId: exactSessionId },
        include: { session: true }
      });

      if (!payment) return { code: '01', message: 'Order not found' };
      if (payment.amount * 100 !== Number(vnp_Params['vnp_Amount'])) return { code: '04', message: 'Invalid amount' };
      if (payment.status !== 'PENDING') return { code: '02', message: 'Order already confirmed' };

      if (rspCode === '00') {
        await prisma.$transaction(async (tx) => {
          await tx.payment.update({
            where: { id: payment.id },
            data: { status: 'SUCCESS' }
          });
          await tx.session.update({
            where: { id: payment.sessionId },
            data: { status: 'COMPLETED', exitTime: new Date(), totalFee: payment.amount }
          });
          if (payment.session?.slotId) {
            await tx.slot.update({
              where: { id: payment.session.slotId },
              data: { status: 'AVAILABLE' }
            });
          }
        });
        
        // 🔥 SỬA: Bắn sessionId ra ngoài cho Controller sử dụng
        return { code: '00', message: 'Confirm Success', sessionId: exactSessionId };
      } else {
        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: 'FAILED' }
        });
        return { code: '00', message: 'Success but payment failed' };
      }
    } else {
      return { code: '97', message: 'Invalid Checksum' };
    }
  },

  // =====================================================================
  // CÁC HÀM TIỆN ÍCH CHUNG
  // =====================================================================
  async getPaymentBySessionId(sessionId: string) {
    const payment = await prisma.payment.findFirst({
      where: { sessionId: sessionId }
    });
    if (!payment) throw new AppError('Không tìm thấy dữ liệu thanh toán cho phiên này', 404);
    return payment;
  },

  async getPaymentSummary() {
    // 🐞 SỬA: trước đây groupBy không lọc status, nên cộng luôn cả các giao dịch VNPay
    // còn ở trạng thái PENDING (khách chưa quét/chưa quét xong) hoặc FAILED vào doanh thu,
    // khiến báo cáo doanh thu bị thổi phồng/sai. Chỉ tính giao dịch đã SUCCESS.
    const summary = await prisma.payment.groupBy({
      where: { status: 'SUCCESS' },
      by: ['paymentMethod'],
      _sum: { amount: true },
      _count: { id: true }
    });

    return summary.map(item => ({
      paymentMethod: item.paymentMethod,
      totalAmount: item._sum.amount || 0,
      totalTransactions: item._count.id
    }));
  }
};
