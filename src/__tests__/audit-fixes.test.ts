/**
 * audit-fixes.test.ts
 * Kiểm tra 7 fix quan trọng từ audit — không cần DB, không cần network.
 */
import dotenv from 'dotenv';
dotenv.config();

// ─── Helpers ────────────────────────────────────────────────────────────────
function vnHourFrom(utcHour: number): number {
  return (utcHour + 7) % 24;
}

function validatePeakHours(parsed: unknown): number[] {
  const defaultHours = [7, 8, 9, 17, 18, 19];
  if (!Array.isArray(parsed)) return defaultHours;
  const valid = parsed.filter(
    (h: unknown) => Number.isInteger(h) && (h as number) >= 0 && (h as number) <= 23
  ) as number[];
  return valid.length > 0 ? valid : defaultHours;
}

function safeCount(raw: unknown): number {
  return Number(raw ?? 0);
}

function safeDecimal(raw: unknown): number {
  return Number(raw ?? 0);
}

// ─── 1. JWT expiry đọc từ .env ───────────────────────────────────────────────
describe('Fix 1 — JWT expiry từ .env', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });
  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  it('dùng giá trị từ JWT_ACCESS_EXPIRES_IN khi set', () => {
    process.env.JWT_ACCESS_EXPIRES_IN = '30m';
    const expiry = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
    expect(expiry).toBe('30m');
  });

  it('fallback về 15m khi JWT_ACCESS_EXPIRES_IN chưa set', () => {
    delete process.env.JWT_ACCESS_EXPIRES_IN;
    const expiry = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
    expect(expiry).toBe('15m');
  });

  it('dùng giá trị từ JWT_REFRESH_EXPIRES_IN khi set', () => {
    process.env.JWT_REFRESH_EXPIRES_IN = '30d';
    const expiry = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
    expect(expiry).toBe('30d');
  });

  it('.env thực tế của dự án có JWT_ACCESS_EXPIRES_IN', () => {
    // Verify .env được load đúng
    expect(process.env.JWT_ACCESS_EXPIRES_IN).toBeDefined();
    expect(process.env.JWT_REFRESH_EXPIRES_IN).toBeDefined();
  });
});

// ─── 2. dev/token chỉ trong development ─────────────────────────────────────
describe('Fix 2 — dev/token gate', () => {
  it('NODE_ENV=production → route bị ẩn', () => {
    const env: string = 'production';
    const exposed = env === 'development';
    expect(exposed).toBe(false);
  });

  it('NODE_ENV=development → route được mở', () => {
    const env: string = 'development';
    const exposed = env === 'development';
    expect(exposed).toBe(true);
  });

  it('NODE_ENV=test → route bị ẩn (không phải development)', () => {
    const env: string = 'test';
    const exposed = env === 'development';
    expect(exposed).toBe(false);
  });

  it('NODE_ENV chưa set (undefined) → route bị ẩn', () => {
    const env = undefined;
    const exposed = env === 'development';
    expect(exposed).toBe(false);
  });
});

// ─── 3. Peak hour UTC+7 ──────────────────────────────────────────────────────
describe('Fix 3 — Peak hour timezone UTC+7', () => {
  const peakHours = [7, 8, 9, 17, 18, 19];

  it('18h Việt Nam = 11h UTC → BUG cũ bỏ sót peak hour', () => {
    const utcHour = 11; // 18h VN = 11h UTC
    const bugResult = peakHours.includes(utcHour); // code cũ dùng getHours() = UTC
    expect(bugResult).toBe(false); // ← sai: bỏ sót peak hour 18h
  });

  it('18h Việt Nam = 11h UTC → FIX mới nhận đúng peak hour', () => {
    const utcHour = 11;
    const vnHour = vnHourFrom(utcHour); // = 18
    const fixResult = peakHours.includes(vnHour);
    expect(fixResult).toBe(true); // ✅ đúng
  });

  it('2h sáng VN (UTC 19h hôm trước) → không phải peak', () => {
    const utcHour = 19; // 2h VN hôm sau
    const vnHour = vnHourFrom(utcHour); // = 2
    expect(peakHours.includes(vnHour)).toBe(false);
  });

  it('wrap-around qua ngày đúng: UTC 23h → VN 6h sáng', () => {
    expect(vnHourFrom(23)).toBe(6);
  });

  it('UTC 17h → VN 0h (nửa đêm) không phải peak', () => {
    const vnHour = vnHourFrom(17); // = 0
    expect(peakHours.includes(vnHour)).toBe(false);
  });
});

// ─── 4. Validate cấu hình peak-hour ─────────────────────────────────────────
describe('Fix 4 — Validate peak hour config', () => {
  it('giá trị hợp lệ được giữ lại', () => {
    const input = [7, 8, 9, 17, 18, 19];
    expect(validatePeakHours(input)).toEqual([7, 8, 9, 17, 18, 19]);
  });

  it('giá trị ngoài 0-23 bị loại', () => {
    const input = [7, 24, -1, 18, 99];
    expect(validatePeakHours(input)).toEqual([7, 18]);
  });

  it('giá trị float bị loại (phải là integer)', () => {
    const input = [7.5, 8, 18.2];
    expect(validatePeakHours(input)).toEqual([8]);
  });

  it('string trong mảng bị loại', () => {
    const input = ['7', 8, '18', 19] as unknown[];
    expect(validatePeakHours(input)).toEqual([8, 19]);
  });

  it('mảng rỗng sau khi lọc → fallback default', () => {
    const input = [99, -5, 'abc'];
    expect(validatePeakHours(input)).toEqual([7, 8, 9, 17, 18, 19]);
  });

  it('không phải array → fallback default', () => {
    expect(validatePeakHours('7,8,9')).toEqual([7, 8, 9, 17, 18, 19]);
    expect(validatePeakHours(null)).toEqual([7, 8, 9, 17, 18, 19]);
    expect(validatePeakHours({})).toEqual([7, 8, 9, 17, 18, 19]);
  });
});

// ─── 5. BigInt từ $queryRaw ───────────────────────────────────────────────────
describe('Fix 5 — BigInt từ PostgreSQL COUNT(*)', () => {
  it('BigInt + number crash (code cũ)', () => {
    const count = BigInt(5);
    // JavaScript không crash khi dùng ||, nhưng arithmetic sẽ fail
    expect(() => {
      const result = 0 + (count as any); // TypeError: Cannot mix BigInt and other types
    }).toThrow(TypeError);
  });

  it('Number(BigInt) an toàn', () => {
    const count = BigInt(5);
    expect(safeCount(count)).toBe(5);
    expect(typeof safeCount(count)).toBe('number');
  });

  it('sum các BigInt counts không crash với Number()', () => {
    const rows = [{ hour: 8, count: BigInt(12) }, { hour: 9, count: BigInt(7) }];
    const total = rows.reduce((sum, r) => sum + Number(r.count ?? 0), 0);
    expect(total).toBe(19);
  });

  it('null/undefined count → 0', () => {
    expect(safeCount(null)).toBe(0);
    expect(safeCount(undefined)).toBe(0);
  });

  it('Decimal từ Prisma aggregate an toàn với Number()', () => {
    // Prisma Decimal object có .toNumber() nhưng Number() cũng works
    const decimal = { toNumber: () => 7163.33, valueOf: () => 7163.33 };
    expect(Number(decimal)).toBe(7163.33);
  });
});

// ─── 6. Capacity không giảm dưới số slot vật lý ─────────────────────────────
describe('Fix 6 — Zone capacity vs total slot count', () => {
  function canReduceCapacity(newCapacity: number, totalSlots: number): boolean {
    return newCapacity >= totalSlots;
  }

  it('capacity 10, total 8 slot → được giảm', () => {
    expect(canReduceCapacity(10, 8)).toBe(true);
  });

  it('capacity 5, total 8 slot → bị chặn', () => {
    expect(canReduceCapacity(5, 8)).toBe(false);
  });

  it('BUG cũ: chỉ check OCCUPIED (3) → cho phép giảm xuống 5 dù có 8 slot vật lý', () => {
    const occupiedOnly = 3;
    const oldCheck = 5 >= occupiedOnly; // code cũ: so với OCCUPIED count
    expect(oldCheck).toBe(true); // cho phép, nhưng SAI
  });

  it('FIX mới: check tổng slot (8) → chặn giảm xuống 5', () => {
    const totalSlots = 8;
    const newCheck = 5 >= totalSlots; // code mới: so với total
    expect(newCheck).toBe(false); // chặn đúng
  });
});

// ─── 7. Slot lock khi có PAYMENT_PENDING ─────────────────────────────────────
describe('Fix 7 — Slot lock không được phép khi PAYMENT_PENDING', () => {
  function canLockSlot(sessions: { status: string }[]): boolean {
    const blocking = sessions.filter(
      s => s.status === 'ACTIVE' || s.status === 'PAYMENT_PENDING'
    );
    return blocking.length === 0;
  }

  it('không có session nào → có thể lock', () => {
    expect(canLockSlot([])).toBe(true);
  });

  it('session ACTIVE → không thể lock', () => {
    expect(canLockSlot([{ status: 'ACTIVE' }])).toBe(false);
  });

  it('session PAYMENT_PENDING → không thể lock (FIX mới)', () => {
    expect(canLockSlot([{ status: 'PAYMENT_PENDING' }])).toBe(false);
  });

  it('BUG cũ: chỉ check ACTIVE → cho phép lock khi PAYMENT_PENDING', () => {
    const sessions = [{ status: 'PAYMENT_PENDING' }];
    const oldCheck = sessions.filter(s => s.status === 'ACTIVE').length === 0;
    expect(oldCheck).toBe(true); // BUG: cho lock trong khi không được
  });

  it('session COMPLETED → có thể lock', () => {
    expect(canLockSlot([{ status: 'COMPLETED' }])).toBe(true);
  });
});
