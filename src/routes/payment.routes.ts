import { Router } from 'express';
import { paymentController } from '../controllers/payment.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';

const router = Router();

// =====================================================================
// CÁC ROUTE BÁO CÁO / TRA CỨU (Đặt trước route có chứa tham số)
// =====================================================================
// Lấy báo cáo tổng quan doanh thu theo phương thức
router.get('/summary', authenticate, authorize(['ADMIN', 'MANAGER', 'STAFF']), paymentController.getPaymentSummary);

// Webhook IPN nhận kết quả tự động từ hệ thống VNPay gửi về
router.get('/vnpay-ipn', paymentController.vnpayIpn);

// Lấy thông tin chi tiết một giao dịch thanh toán theo ID phiên gửi xe
router.get('/:sessionId', authenticate, paymentController.getPaymentBySessionId);

// =====================================================================
// CÁC ROUTE KHỞI TẠO GIAO DỊCH (POST)
// =====================================================================
// Luồng 1: Thanh toán trực tiếp bằng tiền mặt tại quầy (Đóng phiên ngay)
router.post('/', authenticate, authorize(['ADMIN', 'MANAGER', 'STAFF']), paymentController.createPayment);

// Luồng 2: Khởi tạo link thanh toán trực tuyến qua cổng VNPay (Tạo URL/QR)
router.post('/create-url', authenticate, paymentController.createPaymentUrl);

export default router;
