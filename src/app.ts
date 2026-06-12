import path from 'path';
import dotenv from 'dotenv';
import express from 'express';
import http from 'http'; // 1. Bổ sung module http native của Node.js
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import sessionRoutes from './routes/session.routes';
import paymentRoutes from './routes/payment.routes';
import exceptionRoutes from './routes/exception.routes';

// ─── IMPORT SWAGGER (MỚI THÊM) ────────────────────────────────────────────────
import swaggerUi from 'swagger-ui-express';
import swaggerDocument from './config/swagger.json'; // Đảm bảo bạn đã tạo file này

// ─── IMPORT ROUTES ────────────────────────────────────────────────────────────
import zoneGateRoutes from './routes/zone-gate.routes';
import vehicleTypeRoutes from './routes/vehicle-type.routes';
import pricingRoutes from './routes/pricing.routes';
import reservationRoutes from './routes/reservation.routes';
import reportsRoutes from './routes/reports.routes';
import adminRoutes from './routes/admin.routes';
import authRoutes from './routes/auth.route'; // Route B3
import aiRoutes from './routes/ai.route';       // Route B4
import iotRoutes from './routes/iot.route';    // Route B5

// ─── IMPORT SOCKET & CRON ─────────────────────────────────────────────────────
import { initSocket } from './config/socket';
import { startCronJobs } from './services/cron.service';

import { errorHandler, notFoundHandler } from './middlewares/error.middleware';
import { cronJobService } from './services/cron-job.service';

const rootEnvPath = path.resolve(process.cwd(), '.env');
dotenv.config({ path: rootEnvPath, override: true });

const zoneGateRoutes = require('./routes/zone-gate.routes').default;
const slotRoutes = require('./routes/slot.routes').default;

const app = express();

// 2. Bọc app Express bằng http.Server để Socket.io có thể bám vào
const server = http.createServer(app);

// ─── GLOBAL MIDDLEWARES ───────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN ?? '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// ─── HEALTH CHECK ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── SWAGGER DOCUMENTATION (MỚI THÊM) ─────────────────────────────────────────
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// ─── API ROUTES ───────────────────────────────────────────────────────────────
app.use('/api', zoneGateRoutes);
app.use('/api', vehicleTypeRoutes);
app.use('/api', pricingRoutes);
app.use('/api', reservationRoutes);
app.use('/api', reportsRoutes);
app.use('/api', adminRoutes);
app.use('/api', slotRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/exceptions', exceptionRoutes); // ✅ Đã được đưa về đúng tổ đội API
app.use('/api/auth', authRoutes); // Tích hợp Auth API
app.use('/api/ai', aiRoutes);     // Tích hợp AI API
app.use('/api/iot', iotRoutes);   // Tích hợp IoT API

// ─── KHỞI TẠO REAL-TIME ENGINE ────────────────────────────────────────────────
// Tránh khởi tạo Socket và Cron trong môi trường Test để không bị treo tiến trình
if (process.env.NODE_ENV !== 'test') {
  initSocket(server);
  startCronJobs();
}

// ─── ERROR HANDLERS ──────────────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

// ─── CRON JOBS ───────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  // Start auto-cancel reservation cron job (every 1 minute)
  cronJobService.startAutoCancel({
    enabled: true,
    interval: 60000, // 1 minute
  });
}

// Nếu đang chạy môi trường test thì không tự động lắng nghe cổng
// ─── SERVER LISTEN ───────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  const PORT = process.env.PORT ?? 3000;
  
  // 3. ĐỔI TỪ app.listen SANG server.listen
  server.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📖 Swagger API Docs: http://localhost:${PORT}/api-docs`); // Thêm log cho dễ nhìn
    console.log(`📋 Environment: ${process.env.NODE_ENV ?? 'development'}`);
  });
}

// Vẫn export app để Supertest có thể gọi đến trong các file Unit Test
export default app;