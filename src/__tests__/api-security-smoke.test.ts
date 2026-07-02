jest.mock('uuid', () => ({ v4: () => 'security-smoke-uuid' }));

process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET ?? 'test_secret';
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test_secret';

import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app';
import prisma from '../config/db';

const managerAuth = `Bearer ${jwt.sign(
  { id: 'security-manager', role: 'MANAGER' },
  process.env.JWT_ACCESS_SECRET,
)}`;
const driverAuth = `Bearer ${jwt.sign(
  { id: 'security-driver', role: 'DRIVER' },
  process.env.JWT_ACCESS_SECRET,
)}`;

afterAll(async () => prisma.$disconnect());

describe('API authentication barriers', () => {
  const protectedMutations: Array<[string, string]> = [
    ['post', '/api/zones'],
    ['patch', '/api/zones/not-found'],
    ['post', '/api/gates'],
    ['patch', '/api/gates/not-found'],
    ['post', '/api/vehicle-types'],
    ['patch', '/api/vehicle-types/not-found'],
    ['delete', '/api/vehicle-types/not-found'],
    ['post', '/api/zone-vehicle-rules'],
    ['delete', '/api/zone-vehicle-rules'],
    ['post', '/api/pricing'],
    ['patch', '/api/pricing/not-found'],
    ['delete', '/api/pricing/not-found'],
    ['post', '/api/reservations'],
    ['patch', '/api/reservations/not-found/cancel'],
    ['post', '/api/slots'],
    ['patch', '/api/slots/not-found/status'],
    ['patch', '/api/slots/not-found'],
    ['post', '/api/sessions'],
    ['post', '/api/sessions/checkout'],
    ['post', '/api/payments'],
    ['post', '/api/payments/create-url'],
    ['post', '/api/exceptions/lost-ticket'],
    ['post', '/api/exceptions/wrong-plate'],
    ['post', '/api/exceptions/wrong-zone'],
    ['post', '/api/alerts'],
    ['patch', '/api/alerts/not-found/resolve'],
    ['delete', '/api/alerts/not-found'],
    ['patch', '/api/iot/devices/not-found/status'],
    ['post', '/api/auth/logout'],
    ['post', '/api/auth/change-password'],
  ];

  test.each(protectedMutations)('%s %s rejects anonymous requests', async (method, path) => {
    const response = await (request(app) as any)[method](path).send({});
    expect(response.status).toBe(401);
  });

  it('does not allow DRIVER to create a slot', async () => {
    const response = await request(app)
      .post('/api/slots')
      .set('Authorization', driverAuth)
      .send({});
    expect(response.status).toBe(403);
  });
});

describe('Core read API smoke tests', () => {
  const protectedReads = [
    '/api/zones',
    '/api/zones/summary',
    '/api/gates',
    '/api/gates/available',
    '/api/vehicle-types',
    '/api/zone-vehicle-rules',
    '/api/pricing',
    '/api/pricing/active',
    '/api/reservations',
    '/api/reservations/active',
    '/api/slots',
    '/api/sessions',
    '/api/payments/summary',
    '/api/exceptions',
    '/api/alerts',
    '/api/iot/devices',
    '/api/reports/revenue',
    '/api/reports/traffic',
    '/api/reports/occupancy',
    '/api/reports/vehicle-types',
    '/api/reports/peak-hours',
    '/api/admin/audit-logs',
    '/api/admin/system-config',
  ];

  test.each(protectedReads)('GET %s responds without a server error', async (path) => {
    const response = await request(app).get(path).set('Authorization', managerAuth);
    expect(response.status).toBeGreaterThanOrEqual(200);
    expect(response.status).toBeLessThan(500);
  });

  it('keeps documented public reads available', async () => {
    const [slots, peakHours] = await Promise.all([
      request(app).get('/api/slots/realtime'),
      request(app).get('/api/pricing/peak-hours'),
    ]);
    expect(slots.status).toBe(200);
    expect(peakHours.status).toBe(200);
  });
});
