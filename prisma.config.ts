import 'dotenv/config';
import { defineConfig } from '@prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  
  // 👉 ĐÂY LÀ CHỖ PRISMA 7 ĐÒI HỎI BẠN PHẢI BÁO ĐỊA CHỈ:
  datasource: {
    url: process.env.DATABASE_URL as string,
  },
});