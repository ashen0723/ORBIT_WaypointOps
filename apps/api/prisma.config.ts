import { config } from 'dotenv';
import { defineConfig } from 'prisma/config';

config({ path: ['.env', '../../.env'] });

// Prisma 7 no longer reads .env by itself; dotenv loads apps/api/.env or the repo-root .env. In Docker the
// variables come from docker-compose. DATABASE_URL may be absent at image build time (prisma generate
// does not need it), so it is read directly rather than through env(), which would throw.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
