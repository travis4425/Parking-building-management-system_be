import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

import zoneGateRoutes from './routes/zone-gate.routes';
import vehicleTypeRoutes from './routes/vehicle-type.routes';
import pricingRoutes from './routes/pricing.routes';
import reservationRoutes from './routes/reservation.routes';
import reportsRoutes from './routes/reports.routes';
import adminRoutes from './routes/admin.routes';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';
import { cronJobService } from './services/cron-job.service';

dotenv.config();

const app = express();

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
app.use('/api', vehicleTypeRoutes);
app.use('/api', pricingRoutes);
app.use('/api', reservationRoutes);
app.use('/api', reportsRoutes);
app.use('/api', adminRoutes);

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
if (process.env.NODE_ENV !== 'test') {
  const PORT = process.env.PORT ?? 3000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📋 Environment: ${process.env.NODE_ENV ?? 'development'}`);
  });
}

export default app;