import { PrismaClient } from '@prisma/client';

// 1. Khai báo biến global để giữ lại instance Prisma trong môi trường Development
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// 2. Khởi tạo Prisma Client
// Nếu đã có sẵn trong global (do hot-reload) thì dùng lại, nếu chưa có thì tạo mới
const prisma = global.prisma || new PrismaClient({
  // Bật log query SQL ra terminal khi ở môi trường dev để dễ debug
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// 3. Gán lại vào global nếu không phải môi trường production
if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

export default prisma;