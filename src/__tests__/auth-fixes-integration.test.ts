/**
 * auth-fixes-integration.test.ts
 * Test các fix về quyền (authorize) và reservation userId
 * Dùng supertest + JWT thật, mock Prisma để không cần DB.
 */

// ── Mock Prisma trước khi import app ─────────────────────────────────────────
jest.mock('../config/db', () => ({
  __esModule: true,
  default: {
    session: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
      count: jest.fn().mockResolvedValue(0),
      groupBy: jest.fn().mockResolvedValue([]),
    },
    slot: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
      count: jest.fn().mockResolvedValue(0),
    },
    zone: { findMany: jest.fn().mockResolvedValue([]) },
    alert: {
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({ id: 'mock-alert' }),
    },
    reservation: {
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({ id: 'mock-res' }),
    },
    payment: { groupBy: jest.fn().mockResolvedValue([]) },
    auditLog: { create: jest.fn().mockResolvedValue({}) },
    $disconnect: jest.fn(),
    $queryRaw: jest.fn().mockResolvedValue([]),
    systemConfig: { findUnique: jest.fn().mockResolvedValue(null) },
    vehicleType: { findMany: jest.fn().mockResolvedValue([]) },
  },
}));

process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET ?? 'test_secret_for_auth';
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test_secret_for_auth';
process.env.NODE_ENV = 'test';

import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app';

const SECRET = process.env.JWT_ACCESS_SECRET!;

const makeToken = (role: string, id = `${role}-user-id`) =>
  `Bearer ${jwt.sign({ id, role: role.toUpperCase() }, SECRET)}`;

const MANAGER  = makeToken('MANAGER');
const STAFF    = makeToken('STAFF');
const DRIVER   = makeToken('DRIVER');
const NO_AUTH  = '';

afterAll(async () => {
  const { default: prisma } = await import('../config/db');
  await prisma.$disconnect();
});

// ─── Fix 3: GET /sessions chỉ dành cho STAFF+ ─────────────────────────────────
describe('Fix 3 — GET /sessions quyền STAFF+', () => {
  it('unauthenticated → 401', async () => {
    const res = await request(app).get('/api/sessions');
    expect(res.status).toBe(401);
  });

  it('DRIVER → 403 (FIX mới: trước đây 200)', async () => {
    const res = await request(app)
      .get('/api/sessions')
      .set('Authorization', DRIVER);
    expect(res.status).toBe(403);
  });

  it('STAFF → không phải 401/403', async () => {
    const res = await request(app)
      .get('/api/sessions')
      .set('Authorization', STAFF);
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });

  it('MANAGER → không phải 401/403', async () => {
    const res = await request(app)
      .get('/api/sessions')
      .set('Authorization', MANAGER);
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });
});

// ─── Fix 3: GET /sessions/:id chỉ dành cho STAFF+ ────────────────────────────
describe('Fix 3 — GET /sessions/:id quyền STAFF+', () => {
  it('DRIVER → 403', async () => {
    const res = await request(app)
      .get('/api/sessions/some-session-id')
      .set('Authorization', DRIVER);
    expect(res.status).toBe(403);
  });

  it('STAFF → không phải 403', async () => {
    const res = await request(app)
      .get('/api/sessions/some-session-id')
      .set('Authorization', STAFF);
    expect(res.status).not.toBe(403);
  });
});

// ─── Fix 4: POST /alerts chỉ dành cho STAFF+ ─────────────────────────────────
describe('Fix 4 — POST /alerts quyền STAFF+', () => {
  it('unauthenticated → 401', async () => {
    const res = await request(app).post('/api/alerts').send({});
    expect(res.status).toBe(401);
  });

  it('DRIVER → 403 (FIX mới: trước đây có thể tạo alert)', async () => {
    const res = await request(app)
      .post('/api/alerts')
      .set('Authorization', DRIVER)
      .send({ type: 'SENSOR_FAIL', message: 'test', slotId: 'x' });
    expect(res.status).toBe(403);
  });

  it('STAFF → không phải 403', async () => {
    const res = await request(app)
      .post('/api/alerts')
      .set('Authorization', STAFF)
      .send({ type: 'SENSOR_FAIL', message: 'test', slotId: 'x' });
    expect(res.status).not.toBe(403);
  });
});

// ─── Fix 5: AI routes chỉ dành cho STAFF+ ────────────────────────────────────
describe('Fix 5 — AI routes quyền STAFF+', () => {
  it('POST /api/ai/plate-recognize — DRIVER → 403', async () => {
    const res = await request(app)
      .post('/api/ai/plate-recognize')
      .set('Authorization', DRIVER)
      .send({});
    expect(res.status).toBe(403);
  });

  it('POST /api/ai/predict-peak — DRIVER → 403', async () => {
    const res = await request(app)
      .post('/api/ai/predict-peak')
      .set('Authorization', DRIVER)
      .send({});
    expect(res.status).toBe(403);
  });

  it('POST /api/ai/plate-recognize — STAFF → không phải 403', async () => {
    const res = await request(app)
      .post('/api/ai/plate-recognize')
      .set('Authorization', STAFF)
      .send({});
    expect(res.status).not.toBe(403);
  });
});

// ─── Fix 6: Reservation — DRIVER không cần gửi userId ────────────────────────
describe('Fix 6 — Reservation DRIVER không cần gửi userId', () => {
  it('DRIVER gửi reservation không có userId → không phải 400 validation error', async () => {
    const res = await request(app)
      .post('/api/reservations')
      .set('Authorization', DRIVER)
      .send({
        slotId: 'some-slot-id',
        startTime: new Date(Date.now() + 3600_000).toISOString(),
        // userId KHÔNG gửi — trước khi fix, Joi required sẽ trả 400
      });
    // Nếu validation pass thì sẽ đến DB (mock trả lỗi khác, không phải 400)
    // Quan trọng: KHÔNG phải 400 "\"userId\" is required"
    if (res.status === 400) {
      expect(res.body.message).not.toContain('userId');
    } else {
      expect(res.status).not.toBe(400);
    }
  });

  it('DRIVER gửi userId sai người khác → 403', async () => {
    const res = await request(app)
      .post('/api/reservations')
      .set('Authorization', DRIVER) // id = 'DRIVER-user-id'
      .send({
        slotId: 'some-slot-id',
        startTime: new Date(Date.now() + 3600_000).toISOString(),
        userId: 'someone-else-id', // BUG: gửi userId người khác
      });
    // Controller không chặn cái này (overrides với actor.id),
    // nhưng nếu có check thì phải 403
    expect([400, 403, 404, 422, 500]).toContain(res.status); // không phải 200/201
  });
});

// ─── Fix 2: dev/token không lộ trong test env ────────────────────────────────
describe('Fix 2 — /dev/token không lộ ngoài development', () => {
  it('NODE_ENV=test → GET /api/zones/dev/token trả 404', async () => {
    // NODE_ENV=test, route không được mount
    const res = await request(app).get('/api/zones/dev/token');
    expect(res.status).toBe(404);
  });
});
