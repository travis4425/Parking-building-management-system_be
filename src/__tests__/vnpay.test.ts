import crypto from 'crypto';
import qs from 'qs';
import prisma from '../config/db';
import { paymentService } from '../services/payment.service';
import { formatDateTime, sortObject } from '../utils/vnpay.util';

jest.mock('../config/db', () => ({
  __esModule: true,
  default: {
    session: { findUnique: jest.fn() },
    payment: { upsert: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
    $transaction: jest.fn()
  }
}));

const db = prisma as unknown as {
  session: { findUnique: jest.Mock };
  payment: { upsert: jest.Mock; findFirst: jest.Mock; update: jest.Mock };
};

function sign(params: Record<string, string | number>, secret: string) {
  const sorted = sortObject(params);
  const data = qs.stringify(sorted, { encode: false });
  return crypto.createHmac('sha512', secret).update(Buffer.from(data, 'utf8')).digest('hex');
}

describe('VNPay integration', () => {
  const oldEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...oldEnv,
      VNP_TMN_CODE: 'BO3ZSE9R',
      VNP_HASH_SECRET: 'test-secret-at-least-16-characters',
      VNP_URL: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
      VNP_RETURN_URL: 'https://example.com/payment-result'
    };
  });

  afterAll(() => { process.env = oldEnv; });

  it('formats VNPay timestamps in GMT+7', () => {
    expect(formatDateTime(new Date('2026-07-02T00:00:00.000Z'))).toBe('20260702070000');
  });

  it('creates a signed QR URL with required expiry', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-02T00:00:00.000Z'));
    db.session.findUnique.mockResolvedValue({ id: 'session-1', status: 'ACTIVE', totalFee: 20_000 });
    db.payment.upsert.mockResolvedValue({});

    const url = await paymentService.createPaymentUrl('session-1', 20_000, '127.0.0.1');
    const parsed = new URL(url);
    const params = Object.fromEntries(parsed.searchParams.entries());
    const receivedHash = params.vnp_SecureHash;
    delete params.vnp_SecureHash;

    expect(params.vnp_BankCode).toBe('VNPAYQR');
    expect(params.vnp_CreateDate).toBe('20260702070000');
    expect(params.vnp_ExpireDate).toBe('20260702071500');
    expect(params.vnp_Amount).toBe('2000000');
    expect(receivedHash).toBe(sign(params, process.env.VNP_HASH_SECRET!));
    jest.useRealTimers();
  });

  it('does not mark a transaction successful when transaction status failed', async () => {
    const params: Record<string, string> = {
      vnp_TmnCode: 'BO3ZSE9R',
      vnp_Amount: '2000000',
      vnp_TxnRef: '20260702070000_session-1',
      vnp_ResponseCode: '00',
      vnp_TransactionStatus: '02'
    };
    params.vnp_SecureHash = sign(params, process.env.VNP_HASH_SECRET!);
    db.payment.findFirst.mockResolvedValue({
      id: 'payment-1', sessionId: 'session-1', amount: 20_000,
      status: 'PENDING', session: { slotId: null }
    });
    db.payment.update.mockResolvedValue({});

    const result = await paymentService.vnpayIpn(params);

    expect(result).toEqual({ code: '00', message: 'Success but payment failed' });
    expect(db.payment.update).toHaveBeenCalledWith({
      where: { id: 'payment-1' }, data: { status: 'FAILED' }
    });
  });

  it('rejects an IPN signed for another merchant', async () => {
    const params: Record<string, string> = {
      vnp_TmnCode: 'OTHER123',
      vnp_Amount: '2000000',
      vnp_TxnRef: '20260702070000_session-1',
      vnp_ResponseCode: '00',
      vnp_TransactionStatus: '00'
    };
    params.vnp_SecureHash = sign(params, process.env.VNP_HASH_SECRET!);

    await expect(paymentService.vnpayIpn(params)).resolves.toEqual({
      code: '97', message: 'Invalid merchant'
    });
    expect(db.payment.findFirst).not.toHaveBeenCalled();
  });
});
