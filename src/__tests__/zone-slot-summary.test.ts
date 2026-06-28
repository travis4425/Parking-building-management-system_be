/**
 * Zone Summary & Slot Realtime — Integration Tests
 * Mục đích: đảm bảo 2 endpoint dùng để hiển thị "còn bao nhiêu chỗ theo tầng/zone"
 * cho staff (theo quyết định bỏ AI gợi ý slot, chỉ thống kê số lượng) trả đúng dữ liệu thật.
 * Chạy: npx jest src/__tests__/zone-slot-summary.test.ts
 */

// uuid (ESM-only ở bản hiện tại) bị Jest CommonJS transform chặn khi app.ts kéo theo
// session.service.ts -> uuid. Mock lại giống cách ai-ocr.test.ts đã làm để tránh lỗi
// "Unexpected token 'export'" khi import app.
jest.mock('uuid', () => ({
  v4: () => 'test-uuid',
}));

// QUAN TRỌNG: phải set 2 biến này TRƯỚC khi import app (app -> db.ts gọi dotenv.config(),
// dotenv không override biến đã có sẵn trong process.env). Middleware authenticate ưu tiên
// ACCESS_TOKEN_SECRET trước JWT_SECRET (xem auth.middleware.ts) — nếu chỉ set JWT_SECRET,
// token ký bằng JWT_SECRET sẽ bị verify sai key (ACCESS_TOKEN_SECRET thật trong .env) -> luôn 401.
process.env.ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET ?? 'test_secret';
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test_secret';

import request from 'supertest';
import app from '../app';
import jwt from 'jsonwebtoken';
import prisma from '../config/db';

const managerToken = jwt.sign(
  { id: 'test-manager-id', email: 'manager@test.com', role: 'MANAGER' },
  process.env.ACCESS_TOKEN_SECRET ?? 'test_secret',
  { expiresIn: '1h' }
);
const authHeader = `Bearer ${managerToken}`;

afterAll(async () => {
  await prisma.$disconnect();
});

describe('GET /api/zones/summary', () => {
  it('401 — không có token thì bị chặn', async () => {
    const res = await request(app).get('/api/zones/summary');
    expect(res.status).toBe(401);
  });

  it('200 — trả về thống kê chỗ trống theo từng zone đang ACTIVE', async () => {
    const res = await request(app)
      .get('/api/zones/summary')
      .set('Authorization', authHeader);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeInstanceOf(Array);

    // Mọi zone trả về phải đang ACTIVE (zone INACTIVE không nên hiện cho staff)
    res.body.data.forEach((zone: any) => {
      expect(zone.status).toBe('ACTIVE');
      expect(zone).toHaveProperty('floor');
      expect(zone).toHaveProperty('totalSlots');
      expect(zone).toHaveProperty('availableSlots');
      expect(zone).toHaveProperty('occupiedSlots');
      expect(zone).toHaveProperty('occupancyRate');

      // Số trống + đã chiếm không được vượt quá tổng số slot thật của zone
      expect(zone.availableSlots + zone.occupiedSlots).toBeLessThanOrEqual(
        zone.totalSlots
      );

      // occupancyRate phải khớp công thức occupied/total*100 (sai số do Math.round)
      const expectedRate =
        zone.totalSlots > 0
          ? Math.round((zone.occupiedSlots / zone.totalSlots) * 100)
          : 0;
      expect(zone.occupancyRate).toBe(expectedRate);
    });
  });

  it('200 — số liệu khớp với dữ liệu thật trong DB (đối chiếu trực tiếp Prisma)', async () => {
    const res = await request(app)
      .get('/api/zones/summary')
      .set('Authorization', authHeader);

    const dbZones = await prisma.zone.findMany({
      where: { status: 'ACTIVE' },
      include: { slots: { select: { status: true } } },
    });

    expect(res.body.data.length).toBe(dbZones.length);

    for (const dbZone of dbZones) {
      const apiZone = res.body.data.find((z: any) => z.id === dbZone.id);
      expect(apiZone).toBeDefined();
      expect(apiZone.totalSlots).toBe(dbZone.slots.length);
      expect(apiZone.availableSlots).toBe(
        dbZone.slots.filter((s) => s.status === 'AVAILABLE').length
      );
      expect(apiZone.occupiedSlots).toBe(
        dbZone.slots.filter((s) => s.status === 'OCCUPIED').length
      );
    }
  });
});

describe('GET /api/slots/realtime', () => {
  it('200 — trả danh sách slot kèm trạng thái + zone + loại xe (không cần auth, dùng cho màn hình công khai)', async () => {
    const res = await request(app).get('/api/slots/realtime');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeInstanceOf(Array);

    res.body.data.forEach((slot: any) => {
      expect(slot).toHaveProperty('id');
      expect(slot).toHaveProperty('code');
      expect(slot).toHaveProperty('status');
      expect(slot).toHaveProperty('zone');
      expect(['AVAILABLE', 'OCCUPIED', 'RESERVED', 'MAINTENANCE', 'LOCKED']).toContain(
        slot.status
      );
    });
  });

  it('200 — số lượng slot trả về khớp tổng số slot thật trong DB', async () => {
    const res = await request(app).get('/api/slots/realtime');
    const totalInDb = await prisma.slot.count();
    expect(res.body.data.length).toBe(totalInDb);
  });
});
