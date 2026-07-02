jest.mock('uuid', () => ({ v4: () => 'reservation-auth-uuid' }));
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET ?? 'test_secret';

import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app';
import prisma from '../config/db';
import { reservationService } from '../services/reservation.service';

const driverId = 'driver-owner-id';
const driverAuth = `Bearer ${jwt.sign(
  { id: driverId, role: 'DRIVER' },
  process.env.JWT_ACCESS_SECRET,
)}`;

afterEach(() => jest.restoreAllMocks());
afterAll(async () => prisma.$disconnect());

describe('Reservation ownership', () => {
  it('scopes DRIVER reservation lists to the authenticated user', async () => {
    const getAll = jest.spyOn(reservationService, 'getAll').mockResolvedValue({
      data: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    });

    const response = await request(app)
      .get('/api/reservations?userId=someone-else')
      .set('Authorization', driverAuth);

    expect(response.status).toBe(200);
    expect(getAll).toHaveBeenCalledWith(driverId, undefined, 1, 20);
  });

  it('rejects DRIVER access to another user reservation', async () => {
    jest.spyOn(reservationService, 'getById').mockResolvedValue({
      id: 'reservation-id',
      userId: 'someone-else',
    } as any);

    const response = await request(app)
      .get('/api/reservations/reservation-id')
      .set('Authorization', driverAuth);

    expect(response.status).toBe(403);
  });

  it('rejects DRIVER cancellation of another user reservation', async () => {
    jest.spyOn(reservationService, 'getById').mockResolvedValue({
      id: 'reservation-id',
      userId: 'someone-else',
    } as any);
    const cancel = jest.spyOn(reservationService, 'cancel');

    const response = await request(app)
      .patch('/api/reservations/reservation-id/cancel')
      .set('Authorization', driverAuth)
      .send({});

    expect(response.status).toBe(403);
    expect(cancel).not.toHaveBeenCalled();
  });

  it('forces DRIVER-created reservations to use the JWT user id', async () => {
    const create = jest.spyOn(reservationService, 'create').mockResolvedValue({ id: 'new-id' } as any);
    const startTime = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    const response = await request(app)
      .post('/api/reservations')
      .set('Authorization', driverAuth)
      .send({
        userId: 'someone-else',
        vehicleTypeId: 'vehicle-id',
        zoneId: 'zone-id',
        startTime,
        duration: 60,
      });

    expect(response.status).toBe(201);
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ userId: driverId }));
  });
});
