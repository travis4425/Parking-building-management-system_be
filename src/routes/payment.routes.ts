import { Router } from 'express';
import { paymentController } from '../controllers/payment.controller';

const router = Router();

// Lưu ý: Route cụ thể (/summary) phải đặt TRƯỚC route có param (/:sessionId) 
// để Express không bị nhầm chữ "summary" thành một cái ID.
router.get('/summary', paymentController.getPaymentSummary);
router.get('/:sessionId', paymentController.getPaymentBySessionId);
router.post('/', paymentController.createPayment);

export default router;