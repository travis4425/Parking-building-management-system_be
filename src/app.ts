import path from 'path';
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import sessionRoutes from './routes/session.routes';

import { errorHandler, notFoundHandler } from './middlewares/error.middleware';

const rootEnvPath = path.resolve(process.cwd(), '.env');
dotenv.config({ path: rootEnvPath, override: true });

const zoneGateRoutes = require('./routes/zone-gate.routes').default;
const slotRoutes = require('./routes/slot.routes').default;


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
app.use('/api', slotRoutes);
app.use('/api/sessions', sessionRoutes);

// ─── ERROR HANDLERS ──────────────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

// Nếu đang chạy môi trường test thì không tự động lắng nghe cổng
if (process.env.NODE_ENV !== 'test') {
  const PORT = process.env.PORT ?? 3000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📋 Environment: ${process.env.NODE_ENV ?? 'development'}`);
  });
}

export default app;


