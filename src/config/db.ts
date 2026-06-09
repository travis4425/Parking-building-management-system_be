import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import dotenv from 'dotenv';

dotenv.config();

// 1. Lấy chuỗi kết nối từ file .env
const connectionString = `${process.env.DATABASE_URL}`;

// 2. Tạo Pool kết nối bằng thư viện 'pg'
const pool = new Pool({ connectionString });

// 3. Đưa Pool vào Prisma Adapter
const adapter = new PrismaPg(pool);

// 4. Khởi tạo Prisma Client chuẩn v7
const prisma = new PrismaClient({ adapter });

export default prisma;