import express from 'express';
import http from 'http'; // 1. Bổ sung module http native của Node.js
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

// ─── IMPORT ROUTES ────────────────────────────────────────────────────────────
import zoneGateRoutes from './routes/zone-gate.routes';
import authRoutes from './routes/auth.route'; // Route B3
import aiRoutes from './routes/ai.route';       // Route B4
import iotRoutes from './routes/iot.route';    // Route B5

// ─── IMPORT SOCKET & CRON ─────────────────────────────────────────────────────
import { initSocket } from './config/socket';
import { startCronJobs } from './services/cron.service';

import { errorHandler, notFoundHandler } from './middlewares/error.middleware';

dotenv.config();

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

// ─── API ROUTES ───────────────────────────────────────────────────────────────
app.use('/api', zoneGateRoutes);
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

// ─── SERVER LISTEN ───────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  const PORT = process.env.PORT ?? 3000;
  
  // 3. ĐỔI TỪ app.listen SANG server.listen
  server.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📋 Environment: ${process.env.NODE_ENV ?? 'development'}`);
  });
}

// Vẫn export app để Supertest có thể gọi đến trong các file Unit Test
export default app;