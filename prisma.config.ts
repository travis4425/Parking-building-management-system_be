import path from 'path';
import { defineConfig } from 'prisma/config';

// Lưu ý: prisma.config.ts chỉ ảnh hưởng tới Prisma CLI (migrate, generate, studio...),
// KHÔNG ảnh hưởng tới kết nối runtime của app (xem src/config/db.ts dùng DATABASE_URL riêng).
// Prisma v7 đã loại bỏ "adapter" và "directUrl" khỏi config này — chỉ còn datasource.url.
// Vì lệnh migrate cần một connection hỗ trợ advisory lock / prepared statement
// (transaction pooler port 6543 KHÔNG hỗ trợ), ta dùng DIRECT_URL (session pooler / direct, port 5432) ở đây.
export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  datasource: {
    url: process.env.DIRECT_URL as string,
  },
})
