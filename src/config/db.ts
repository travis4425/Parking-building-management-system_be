import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import dotenv from 'dotenv';

dotenv.config();

// 1. Lấy chuỗi kết nối từ file .env
const connectionString = `${process.env.DATABASE_URL}`;

// 2. Tạo Pool kết nối bằng thư viện 'pg'
const pool = new Pool({
  connectionString,
  max: Number(process.env.DB_POOL_MAX ?? 10),
  connectionTimeoutMillis: 10_000,
  idleTimeoutMillis: 30_000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10_000,
});

// Pool có thể nhận lỗi từ một connection đang idle (mạng/DB đóng socket). Có listener
// để process không crash; pg sẽ loại connection hỏng và tạo connection mới ở query sau.
pool.on('error', (error) => {
  console.error('PostgreSQL pool connection error:', error.message);
});

// 3. Đưa Pool vào Prisma Adapter
const adapter = new PrismaPg(pool);

// 4. Khởi tạo Prisma Client chuẩn v7
const prisma = new PrismaClient({ adapter });

export default prisma;
