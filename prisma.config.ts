import path from 'path';
import { defineConfig } from 'prisma/config';
import { PrismaPg } from '@prisma/adapter-pg';

export default defineConfig({
  earlyAccess: true,
  schema: path.join('prisma', 'schema.prisma'),
  migrate: {
    async adapter() {
      const { Pool } = await import('pg')
      const pool = new Pool({
        connectionString: process.env.DIRECT_URL,
      })
      return new PrismaPg(pool)
    },
  },
  datasource: {
    url: process.env.DATABASE_URL as string,
  },
})