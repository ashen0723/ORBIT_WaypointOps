# Deployment

Use Docker with Compose v2 or later. Copy `.env.example` to `.env`, set a random
JWT_SECRET of at least 32 characters (for example, generate with `openssl rand -hex 32`),
and replace the database password before public use. Never commit `.env`.
The template JWT placeholder is intentionally rejected by the existing API validation.

```sh
docker compose config --quiet
docker compose build
docker compose up -d
docker compose ps -a
docker compose logs db-init
curl --fail http://localhost:3000/api/health
curl --fail http://localhost:8080/healthz
curl --fail http://localhost:8080/api/health
```

Root `docker compose up` starts the complete stack in this order:
PostgreSQL healthy → db-init completes migrations and demo seed successfully →
API starts and becomes healthy → web starts. A failed migration or seed blocks API
and web startup; inspect `docker compose logs db-init` before retrying.
The long-running API process runs only `node dist/main.js`. The API checks PostgreSQL with SELECT 1, not schema completeness.
The web health check checks nginx only. Both images serve production builds;
Compose forces NODE_ENV=production. Node fetch and nginx Alpine's BusyBox wget
provide the health checks without installing curl.

## Automatic database preparation

The one-shot db-init service uses the API image and `/app/apps/api` working directory.
It runs `npm run db:deploy && npm run db:seed` with no workspace path flag:

- Migration: `npm run db:deploy` executes `prisma migrate deploy`.
- Seed: `npm run db:seed` executes `prisma db seed`; Prisma's configured seed is
  `npx tsx prisma/seed.ts` (the existing idempotent demo seed).

Neither migrate dev, database resets/drops nor private dataset imports run automatically.
Choose SEED_DEMO_PASSWORD before startup. On subsequent Compose starts the init service
can run again; committed migrations and the existing idempotent seed support reruns.
An already-running stack is not automatically reinitialized by restarting only API.
Optional planning-demo fixtures and official imports remain separate operator actions.
Review migrations and back up an existing database before deploying a new version.
For an explicit init rerun, use `docker compose run --rm db-init` while application
traffic is stopped, then start the stack again.

The API runtime retains Prisma/tsx and build tooling so the same image can run db-init;
slimming this further requires a separate operator image. Both run as the unprivileged
node user. The uploads volume is reserved for a future adapter; current evidence is in
PostgreSQL. A future filesystem writer must provision volume permissions for that user.

postgres_data persists database files; uploads_data is also retained. Use
`docker compose down` to stop the stack while preserving volumes. Changing PostgreSQL
credentials in `.env` does not update users in an already initialized volume.

## Configuration and public hosting

- POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD configure PostgreSQL initialization.
  Compose derives DATABASE_URL using `db:5432`. The template DATABASE_URL is for
  host-side Prisma/API commands only. URL-encode reserved characters in the URL's
  credentials; use a URL-safe password for the derived Compose URL.
- PostgreSQL is bound only to 127.0.0.1:POSTGRES_PORT (default 5432) for local tools.
  Remove this port mapping for public hosting if no host-side tools need it.
- API_PORT controls the host port (default 3000); internal PORT is fixed at 3000,
  matching nginx and the health check. WEB_PORT defaults to 8080. These HTTP ports
  bind all host interfaces: restrict them with the hosting firewall/reverse proxy.
- JWT_SECRET is required; JWT_EXPIRES_IN defaults to 12h. MAX_UPLOAD_MB is 10 by
  default and nginx allows 11 MiB including multipart framing. Coordinate both
  limits if changing uploads. UPLOAD_DIR is reserved for a future storage adapter.
- CORS_ORIGIN is one exact browser origin, default http://localhost:8080. Set it to
  the actual HTTPS frontend origin, or change it when WEB_PORT changes. The existing
  API supports one string origin, not a comma-separated allowlist.
- VITE_API_BASE_URL defaults to /api; nginx proxies to api:3000, preserving /api.
  It is public build-time configuration: rebuild web when it changes. For separate
  frontend/backend hosting use an HTTPS backend URL ending in /api, without a
  trailing slash, and configure CORS_ORIGIN on the backend. Vite dev proxies to
  localhost:3000; a different host API port needs a separate dev proxy adjustment.

Choose the provider, domain, TLS termination, ingress routing, secret management,
managed-PostgreSQL SSL requirements, backups and storage retention before publishing.
No provider or public domain is hardcoded. The current Compose topology assumes
all services share a Docker network. Public HTTPS is required for offline service
worker behavior away from localhost. Proxy trust and forwarded-protocol handling
must be reviewed against the selected ingress before relying on them.

## Post-merge integration checks

Do not merge feature branches as part of deployment setup. After the DB/Auth/Fleet/
Frontend-Auth integration is finalized, review migrations and seed commands again,
check JWT validation/contracts, route ownership, public API URL and CORS behavior,
and run the complete login and cross-role workflow against a disposable database.
Do not infer that a passing health endpoint validates these features. If the final
DB branch changes migration/seed behavior, reconcile those commands explicitly
rather than adding speculative startup scripts.
