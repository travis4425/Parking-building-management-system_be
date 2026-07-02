import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import dotenv from 'dotenv';

dotenv.config();

// 1. Lấy chuỗi kết nối từ file .env
// Supabase direct hosts may only expose IPv6. The optional pooler settings let
// local/hosted runtimes use the IPv4-compatible Session Pooler while keeping
// the password and database name in DATABASE_URL.
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is not configured');
}

const poolerHost = process.env.SUPABASE_POOLER_HOST;
const projectRef = new URL(databaseUrl).hostname.match(/^db\.([^.]+)\.supabase\.co$/)?.[1];
const poolConfig = poolerHost && projectRef
  ? {
      connectionString: databaseUrl,
      host: poolerHost,
      port: Number(process.env.SUPABASE_POOLER_PORT ?? 5432),
      user: `postgres.${projectRef}`,
      ssl: { rejectUnauthorized: false },
    }
  : { connectionString: databaseUrl };

// 2. Tạo Pool kết nối bằng thư viện 'pg'
const pool = new Pool({
  ...poolConfig,
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
