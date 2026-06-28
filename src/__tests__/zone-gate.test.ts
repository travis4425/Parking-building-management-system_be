/**
 * Zone & Gate API — Integration Tests
 * Chạy: npx jest src/__tests__/zone-gate.test.ts
 */

// uuid (ESM-only ở bản hiện tại) bị Jest CommonJS transform chặn khi app.ts kéo theo
// session.service.ts -> uuid. Mock lại giống ai-ocr.test.ts / zone-slot-summary.test.ts.
jest.mock('uuid', () => ({
  v4: () => 'test-uuid',
}));

// QUAN TRỌNG: phải set 2 biến này TRƯỚC khi import app (xem giải thích trong
// zone-slot-summary.test.ts) — authenticate ưu tiên ACCESS_TOKEN_SECRET trước JWT_SECRET.
process.env.ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET ?? 'test_secret';
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test_secret';

import request from 'supertest';
import app from '../app';
import jwt from 'jsonwebtoken';
import prisma from '../config/db';

// Tạo token test với role MANAGER
const managerToken = jwt.sign(
  { id: 'test-manager-id', email: 'manager@test.com', role: 'MANAGER' },
  process.env.ACCESS_TOKEN_SECRET ?? 'test_secret',
  { expiresIn: '1h' }
);

const staffToken = jwt.sign(
  { id: 'test-staff-id', email: 'staff@test.com', role: 'STAFF' },
  process.env.ACCESS_TOKEN_SECRET ?? 'test_secret',
  { expiresIn: '1h' }
);

const authHeader = `Bearer ${managerToken}`;
const staffHeader = `Bearer ${staffToken}`;

let createdZoneId: string;
let createdGateId: string;

// 🧹 BÁC LAO CÔNG: Quét sạch rác từ các lần test trước khi bắt đầu
beforeAll(async () => {
  await prisma.gate.deleteMany({ where: { code: { contains: 'TEST-GATE' } } });
  await prisma.zone.deleteMany({ where: { name: { contains: 'Tầng Test' } } });

  // 🐞 SỬA: zone.service/gate.service đều ghi AuditLog với userId lấy từ JWT
  // (req.user.id). AuditLog.userId là khóa ngoại bắt buộc tới bảng User, nhưng
  // 'test-manager-id'/'test-staff-id' trong token chỉ là chuỗi giả, không tồn
  // tại trong DB -> Postgres báo lỗi FK (P2003) -> middleware trả 400/422 thay
  // vì 201, kéo theo toàn bộ test sau (PATCH/POST tiếp theo) fail dây chuyền vì
  // không có zone/gate nào được tạo thật. Seed 2 user thật khớp id trong token.
  await prisma.user.upsert({
    where: { id: 'test-manager-id' },
    update: {},
    create: {
      id: 'test-manager-id',
      email: 'manager@test.com',
      password: 'test_password_hash',
      fullName: 'Test Manager',
      role: 'MANAGER',
    },
  });
  await prisma.user.upsert({
    where: { id: 'test-staff-id' },
    update: {},
    create: {
      id: 'test-staff-id',
      email: 'staff@test.com',
      password: 'test_password_hash',
      fullName: 'Test Staff',
      role: 'STAFF',
    },
  });
});

// Dọn dẹp sau khi test xong
afterAll(async () => {
  if (createdGateId) {
    await prisma.gate.deleteMany({ where: { id: createdGateId } });
  }
  if (createdZoneId) {
    await prisma.zone.deleteMany({ where: { id: createdZoneId } });
  }
  // Xóa audit log trước (FK tới user) rồi mới xóa 2 user test
  await prisma.auditLog.deleteMany({ where: { userId: { in: ['test-manager-id', 'test-staff-id'] } } });
  await prisma.user.deleteMany({ where: { id: { in: ['test-manager-id', 'test-staff-id'] } } });
  await prisma.$disconnect();
});

// ─── ZONE TESTS ────────────────────────────────────────────────────────────────

describe('Zone API', () => {
  describe('GET /api/zones', () => {
    it('200 — trả danh sách zone khi đã xác thực', async () => {
      const res = await request(app)
        .get('/api/zones')
        .set('Authorization', authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.meta).toHaveProperty('total');
    });

    it('401 — trả lỗi khi không có token', async () => {
      const res = await request(app).get('/api/zones');
      expect(res.status).toBe(401);
    });

    it('200 — filter theo status', async () => {
      const res = await request(app)
        .get('/api/zones?status=ACTIVE')
        .set('Authorization', authHeader);

      expect(res.status).toBe(200);
      res.body.data.forEach((z: any) => {
        expect(z.status).toBe('ACTIVE');
      });
    });
  });

  describe('POST /api/zones', () => {
    it('201 — tạo zone mới thành công', async () => {
      const res = await request(app)
        .post('/api/zones')
        .set('Authorization', authHeader)
        .send({
          name: 'Tầng Test Auto',
          floor: 45, // Đổi tầng để không trùng data cũ
          capacity: 10,
          description: 'Zone dùng cho test',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Tầng Test Auto');
      createdZoneId = res.body.data.id;
    });

    it('422 — thiếu trường bắt buộc', async () => {
      const res = await request(app)
        .post('/api/zones')
        .set('Authorization', authHeader)
        .send({ name: 'Thiếu floor' });

      expect(res.status).toBe(422);
    });

    it('403 — STAFF không được tạo zone', async () => {
      const res = await request(app)
        .post('/api/zones')
        .set('Authorization', staffHeader)
        .send({ name: 'Test', floor: 5, capacity: 10 });

      expect(res.status).toBe(403);
    });

    it('409 — trùng tên+tầng', async () => {
      const res = await request(app)
        .post('/api/zones')
        .set('Authorization', authHeader)
        .send({ name: 'Tầng Test Auto', floor: 45, capacity: 5 });

      expect(res.status).toBe(409);
    });
  });

  describe('PATCH /api/zones/:id', () => {
    it('200 — cập nhật zone thành công', async () => {
      const res = await request(app)
        .patch(`/api/zones/${createdZoneId}`)
        .set('Authorization', authHeader)
        .send({ description: 'Mô tả đã cập nhật' });

      expect(res.status).toBe(200);
      expect(res.body.data.description).toBe('Mô tả đã cập nhật');
    });

    it('404 — zone không tồn tại', async () => {
      const res = await request(app)
        .patch('/api/zones/00000000-0000-0000-0000-000000000000')
        .set('Authorization', authHeader)
        .send({ status: 'INACTIVE' });

      expect(res.status).toBe(404);
    });
  });
});

// ─── GATE TESTS ────────────────────────────────────────────────────────────────

describe('Gate API', () => {
  describe('GET /api/gates', () => {
    it('200 — trả danh sách gate', async () => {
      const res = await request(app)
        .get('/api/gates')
        .set('Authorization', authHeader);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
    });

    it('200 — filter theo type=ENTRY', async () => {
      const res = await request(app)
        .get('/api/gates?type=ENTRY')
        .set('Authorization', authHeader);

      expect(res.status).toBe(200);
      res.body.data.forEach((g: any) => {
        expect(['ENTRY', 'BOTH']).toContain(g.type);
      });
    });
  });

  describe('POST /api/gates', () => {
    it('201 — tạo gate mới thành công', async () => {
      const res = await request(app)
        .post('/api/gates')
        .set('Authorization', authHeader)
        .send({
          name: 'Cổng Test Mới',
          code: 'TEST-GATE-888', // Đổi mã code cho chắc ăn
          type: 'ENTRY',
          zoneId: createdZoneId,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.code).toBe('TEST-GATE-888');
      createdGateId = res.body.data.id;
    });

    it('409 — trùng mã cổng', async () => {
      const res = await request(app)
        .post('/api/gates')
        .set('Authorization', authHeader)
        .send({
          name: 'Cổng Khác',
          code: 'TEST-GATE-888',
          type: 'EXIT',
          zoneId: createdZoneId,
        });

      expect(res.status).toBe(409);
    });

    it('404 — zoneId không tồn tại', async () => {
      const res = await request(app)
        .post('/api/gates')
        .set('Authorization', authHeader)
        .send({
          name: 'Cổng Lạ',
          code: 'GATE-UNKNOWN',
          type: 'BOTH',
          zoneId: '00000000-0000-0000-0000-000000000000',
        });

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/gates/available', () => {
    it('200 — trả cổng ENTRY khả dụng', async () => {
      const res = await request(app)
        .get('/api/gates/available?type=ENTRY')
        .set('Authorization', authHeader);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
    });

    it('400 — thiếu type param', async () => {
      const res = await request(app)
        .get('/api/gates/available')
        .set('Authorization', authHeader);

      expect(res.status).toBe(400);
    });
  });

  describe('PATCH /api/gates/:id', () => {
    it('200 — cập nhật status cổng', async () => {
      const res = await request(app)
        .patch(`/api/gates/${createdGateId}`)
        .set('Authorization', authHeader)
        .send({ status: 'MAINTENANCE' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('MAINTENANCE');
    });
  });
});