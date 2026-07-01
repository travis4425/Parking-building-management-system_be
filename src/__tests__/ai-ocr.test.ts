jest.mock('uuid', () => ({
  v4: () => 'test-uuid',
}));

process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET ?? 'test_secret';
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test_secret';

// 🐞 SỬA: recognizePlateWithPlateRecognizer (ai.service.ts) kiểm tra PLATE_RECOGNIZER_API_KEY
// ngay đầu hàm — nếu trống thì trả thẳng fallback "UNKNOWN" và KHÔNG gọi fetch, khiến mock
// global.fetch ở dưới vô dụng (test luôn nhận "UNKNOWN" dù mock trả "29A-12345"). Phải set
// biến này trước khi import app để code đi vào nhánh gọi fetch thật (đã mock).
process.env.PLATE_RECOGNIZER_API_KEY = process.env.PLATE_RECOGNIZER_API_KEY ?? 'test_api_key';

import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app';
import prisma from '../config/db';

describe('AI plate recognition proxy', () => {
  const token = jwt.sign(
    { id: 'test-staff-id', email: 'staff@test.com', role: 'STAFF' },
    process.env.JWT_ACCESS_SECRET ?? 'test_secret',
    { expiresIn: '1h' }
  );

  const authHeader = `Bearer ${token}`;

  const originalFetch = global.fetch;

  afterAll(async () => {
    await prisma.$disconnect();
  });

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

  // 🔀 Merge từ nhánh Tan: test upload_url gửi regions dạng mảng + fallback multipart
  it('sends upload_url requests with regions as an array', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          {
            plate: '29A-12345',
            score: 0.97,
          },
        ],
      }),
    });

    global.fetch = fetchMock as unknown as typeof fetch;
    process.env.PLATE_RECOGNIZER_API_KEY = 'test-api-key';
    process.env.PLATE_RECOGNIZER_REGIONS = 'vn';

    const res = await request(app)
      .post('/api/ai/plate-recognize')
      .set('Authorization', authHeader)
      .send({ image: 'https://example.com/car.jpg' });

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [, requestInit] = fetchMock.mock.calls[0];
    expect(requestInit?.method).toBe('POST');
    expect(requestInit?.headers).toMatchObject({
      Authorization: 'Token test-api-key',
      'Content-Type': 'application/json',
    });
    expect(JSON.parse(requestInit?.body as string)).toEqual({
      upload_url: 'https://example.com/car.jpg',
      regions: ['vn'],
    });
  });

  it('falls back to multipart upload when the remote URL lookup fails', async () => {
    const fetchMock = jest.fn(async (input: any, init?: any) => {
      const targetUrl = typeof input === 'string' ? input : input?.url;

      if (targetUrl === 'https://example.com/car.jpg') {
        return {
          ok: true,
          arrayBuffer: async () => new TextEncoder().encode('fake-image-bytes').buffer,
          headers: {
            get: (name: string) => (name.toLowerCase() === 'content-type' ? 'image/jpeg' : null),
          },
        };
      }

      if (targetUrl === 'https://api.platerecognizer.com/v1/plate-reader/' && init?.headers?.['Content-Type'] === 'application/json') {
        return {
          ok: false,
          status: 400,
          text: async () => 'cannot identify image file <InMemoryUploadedFile: car.jpg (image/jpeg)>',
        };
      }

      return {
        ok: true,
        json: async () => ({
          results: [
            {
              plate: '51A-12345',
              score: 0.88,
            },
          ],
        }),
      };
    });

    global.fetch = fetchMock as unknown as typeof fetch;
    process.env.PLATE_RECOGNIZER_API_KEY = 'test-api-key';
    process.env.PLATE_RECOGNIZER_REGIONS = 'vn';

    const res = await request(app)
      .post('/api/ai/plate-recognize')
      .set('Authorization', authHeader)
      .send({ image: 'https://example.com/car.jpg' });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      plate: '51A-12345',
      plateNumber: '51A-12345',
      licensePlate: '51A-12345',
      confidence: 0.88,
      source: 'plate-recognizer',
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
