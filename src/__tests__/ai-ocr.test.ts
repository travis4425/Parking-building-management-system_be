jest.mock('uuid', () => ({
  v4: () => 'test-uuid',
}));

process.env.ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET ?? 'test_secret';
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test_secret';

// 🐞 SỬA: recognizePlateWithPlateRecognizer (ai.service.ts) kiểm tra PLATE_RECOGNIZER_API_KEY
// ngay đầu hàm — nếu trống thì trả thẳng fallback "UNKNOWN" và KHÔNG gọi fetch, khiến mock
// global.fetch ở dưới vô dụng (test luôn nhận "UNKNOWN" dù mock trả "29A-12345"). Phải set
// biến này trước khi import app để code đi vào nhánh gọi fetch thật (đã mock).
process.env.PLATE_RECOGNIZER_API_KEY = process.env.PLATE_RECOGNIZER_API_KEY ?? 'test_api_key';

import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app';

describe('AI plate recognition proxy', () => {
  const token = jwt.sign(
    { id: 'test-staff-id', email: 'staff@test.com', role: 'STAFF' },
    process.env.JWT_SECRET ?? 'test_secret',
    { expiresIn: '1h' }
  );

  const authHeader = `Bearer ${token}`;

  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          {
            plate: '29A-12345',
            score: 0.97,
            cpn: 0.97,
          },
        ],
      }),
    }) as unknown as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('returns legacy-compatible plate and confidence payload', async () => {
    const res = await request(app)
      .post('/api/ai/plate-recognize')
      .set('Authorization', authHeader)
      .send({ image: 'data:image/jpeg;base64,abc123' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({
      plate: '29A-12345',
      plateNumber: '29A-12345',
      licensePlate: '29A-12345',
      confidence: 0.97,
      confidenceScore: 0.97,
      rawText: '29A-12345',
    });
  });
});
