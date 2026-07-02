jest.mock('uuid', () => ({
  v4: jest.fn(() => `test-checkin-${Date.now()}-${Math.random()}`),
}));

process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET ?? 'test_secret';
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test_secret';

import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app';
import prisma from '../config/db';

const TEST_PLATE_PREFIX = 'TEST-CHECKIN-';
const staffToken = jwt.sign(
  { id: 'test-staff-id', role: 'STAFF' },
  process.env.JWT_ACCESS_SECRET,
  { expiresIn: '1h' },
);
const driverToken = jwt.sign(
  { id: 'test-driver-id', role: 'DRIVER' },
  process.env.JWT_ACCESS_SECRET,
  { expiresIn: '1h' },
);
const staffAuth = `Bearer ${staffToken}`;

async function cleanTestSessions() {
  const sessions = await prisma.session.findMany({
    where: { licensePlate: { startsWith: TEST_PLATE_PREFIX } },
    select: { id: true, slotId: true },
  });

  await prisma.$transaction(async (tx) => {
    await tx.session.deleteMany({
      where: { id: { in: sessions.map((session) => session.id) } },
    });
    await tx.slot.updateMany({
      where: { id: { in: sessions.flatMap((session) => session.slotId ?? []) } },
      data: { status: 'AVAILABLE' },
    });
  });
}

beforeAll(cleanTestSessions);
afterAll(async () => {
  await cleanTestSessions();
  await prisma.$disconnect();
});

describe('POST /api/sessions - check-in', () => {
  it('returns 401 without an access token', async () => {
    const response = await request(app).post('/api/sessions').send({});
    expect(response.status).toBe(401);
  });

  it('returns 403 for DRIVER role', async () => {
    const response = await request(app)
      .post('/api/sessions')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({});
    expect(response.status).toBe(403);
  });

  it('returns 400 when required fields are missing', async () => {
    const response = await request(app)
      .post('/api/sessions')
      .set('Authorization', staffAuth)
      .send({ licensePlate: `${TEST_PLATE_PREFIX}MISSING` });
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('creates an ACTIVE session and occupies the selected slot', async () => {
    const slot = await prisma.slot.findFirstOrThrow({
      where: { status: 'AVAILABLE', vehicleTypeId: { not: null } },
    });
    const licensePlate = `${TEST_PLATE_PREFIX}SUCCESS`;

    const response = await request(app)
      .post('/api/sessions')
      .set('Authorization', staffAuth)
      .send({ slotId: slot.id, vehicleTypeId: slot.vehicleTypeId, licensePlate });

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({
      slotId: slot.id,
      vehicleTypeId: slot.vehicleTypeId,
      licensePlate,
      status: 'ACTIVE',
    });
    await expect(prisma.slot.findUniqueOrThrow({ where: { id: slot.id } }))
      .resolves.toMatchObject({ status: 'OCCUPIED' });
  });

  it('rejects a vehicle type that does not match the selected slot', async () => {
    const slot = await prisma.slot.findFirstOrThrow({
      where: { status: 'AVAILABLE', vehicleTypeId: { not: null } },
    });
    const otherType = await prisma.vehicleType.findFirstOrThrow({
      where: { id: { not: slot.vehicleTypeId! } },
    });

    const response = await request(app)
      .post('/api/sessions')
      .set('Authorization', staffAuth)
      .send({
        slotId: slot.id,
        vehicleTypeId: otherType.id,
        licensePlate: `${TEST_PLATE_PREFIX}WRONG-TYPE`,
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('returns 409 when the plate already has an ACTIVE session', async () => {
    const slots = await prisma.slot.findMany({
      where: { status: 'AVAILABLE', vehicleTypeId: { not: null } },
      take: 20,
    });
    const pair = slots.find((slot, index) =>
      slots.some((candidate, candidateIndex) =>
        candidateIndex !== index && candidate.vehicleTypeId === slot.vehicleTypeId,
      ),
    );
    if (!pair) throw new Error('Test requires two available slots for one vehicle type');
    const secondSlot = slots.find(
      (slot) => slot.id !== pair.id && slot.vehicleTypeId === pair.vehicleTypeId,
    )!;
    const licensePlate = `${TEST_PLATE_PREFIX}DUPLICATE`;

    const first = await request(app)
      .post('/api/sessions')
      .set('Authorization', staffAuth)
      .send({ slotId: pair.id, vehicleTypeId: pair.vehicleTypeId, licensePlate });
    expect(first.status).toBe(201);

    const duplicate = await request(app)
      .post('/api/sessions')
      .set('Authorization', staffAuth)
      .send({ slotId: secondSlot.id, vehicleTypeId: pair.vehicleTypeId, licensePlate });
    expect(duplicate.status).toBe(409);
  });

  it('supports the complete check-in, checkout, and cash payment lifecycle', async () => {
    const slot = await prisma.slot.findFirstOrThrow({
      where: {
        status: 'AVAILABLE',
        vehicleTypeId: { not: null },
        vehicleType: { pricePolicies: { some: { isActive: true } } },
      },
    });
    const licensePlate = `${TEST_PLATE_PREFIX}LIFECYCLE`;

    const checkIn = await request(app)
      .post('/api/sessions')
      .set('Authorization', staffAuth)
      .send({ slotId: slot.id, vehicleTypeId: slot.vehicleTypeId, licensePlate });
    expect(checkIn.status).toBe(201);

    const checkOut = await request(app)
      .post('/api/sessions/checkout')
      .set('Authorization', staffAuth)
      .send({ qrToken: checkIn.body.data.qrToken });
    expect(checkOut.status).toBe(200);
    expect(checkOut.body.data.status).toBe('PAYMENT_PENDING');
    expect(checkOut.body.data.totalFee).toBeGreaterThan(0);

    const wrongAmount = await request(app)
      .post('/api/payments')
      .set('Authorization', staffAuth)
      .send({
        sessionId: checkIn.body.data.id,
        amount: checkOut.body.data.totalFee + 1,
        paymentMethod: 'CASH',
      });
    expect(wrongAmount.status).toBe(400);

    const payment = await request(app)
      .post('/api/payments')
      .set('Authorization', staffAuth)
      .send({
        sessionId: checkIn.body.data.id,
        amount: checkOut.body.data.totalFee,
        paymentMethod: 'CASH',
      });
    expect(payment.status).toBe(201);

    await expect(prisma.session.findUniqueOrThrow({ where: { id: checkIn.body.data.id } }))
      .resolves.toMatchObject({ status: 'COMPLETED' });
    await expect(prisma.slot.findUniqueOrThrow({ where: { id: slot.id } }))
      .resolves.toMatchObject({ status: 'AVAILABLE' });
  });
});
