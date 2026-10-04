# ORBIT · Waypoint Operations

Waypoint Group delivery operations platform for the Rootcode **Tech-Triathlon 2026** Hackathon.

One responsive web app connects the four people who move an order from shelf to store:

| Role | Works on | Does in Waypoint |
|---|---|---|
| **Store Manager** | Outlet desktop / phone | Places orders before the 4 PM cutoff, tracks ETA, sees deferrals, confirms receipt and reports issues |
| **Dispatcher** | Large screen, Peliyagoda office | Builds the daily plan, allocates orders to vehicles/trips within constraints, defers with reasons, monitors delivery |
| **Loader** | Shared dock tablet | Loads in stop sequence, flags missing/damaged goods before departure, marks the trip ready |
| **Driver** | Personal phone, often offline | Follows the route, records arrival, outcome and proof of delivery, syncs when back online |

## Quick start (Docker)

Prerequisites: Docker Desktop 4.x (Compose v2) and Git.

```bash
cp .env.example .env
docker compose up --build
```

- Web app: <http://localhost:8080>
- API health: <http://localhost:3000/api/health>

`docker compose up` starts PostgreSQL, applies migrations, runs the seed (safe to re-run), starts the API, then
the web app. Reset all data with `docker compose down -v`.

## Demo accounts

Password for every account: `waypoint-demo` (set by `SEED_DEMO_PASSWORD`).

| Role | Email | Lands on |
|---|---|---|
| Dispatcher | `dispatcher@waypoint.lk` | `/dispatcher` |
| Loader | `loader@waypoint.lk` | `/loader` |
| Driver | `driver@waypoint.lk` | `/driver` |
| Store Manager | `store@waypoint.lk` | `/store` |
| Store Manager (2nd outlet, permission checks) | `store2@waypoint.lk` | `/store` |

Sessions are per browser tab: open one tab per role to follow an order across roles.

## Local development (without building images)

Requires Node.js 22+ and Docker (for the database only).

```bash
cp .env.example .env
npm install
docker compose up -d db
npm run db:deploy -w apps/api
npm run db:seed -w apps/api
npm run dev:api
npm run dev:web
```

- Web (Vite): <http://localhost:5173>. `/api` is proxied to the API on :3000.
- The Prisma client (`apps/api/src/generated`, gitignored) is generated automatically before `build`, `test`
  and `start:dev`; run `npx prisma generate` in `apps/api` after editing the schema in an already-running session.
- Schema changes: `cd apps/api && npx prisma migrate dev --name <change>` after editing `prisma/schema.prisma`.
- Tests: `npm test` (web: Vitest, api: Jest).
- Shared contract checks: `npm run typecheck -w packages/contracts`.

> **npm 11 note:** npm 11 skips package install scripts unless approved. If `prisma` or `bcrypt` misbehave
> locally, run `npm approve-scripts --allow-scripts-pending` and reinstall. Docker images use npm 10 and are
> unaffected.

## Repository layout

```
apps/
  web/                    React 18 + Vite + Tailwind — one app, four roles
    src/app/              root: login gate + role → module routing
    src/features/
      dispatcher/         Dispatcher module (+ leader's Login, session, in-browser mock server)
      store-manager/      Store Manager module
      loader/             Loader module
      driver/             Driver module
    src/api/client.ts     fetch wrapper for the NestJS API
  api/                    NestJS 11 REST API (global prefix /api)
    src/<module>/         auth users outlets orders fleet planning trips loading delivery receipts sync common
    prisma/               schema.prisma, migrations/, seed.ts
packages/contracts/       shared role constants/types
docs/                     architecture, data model, AI disclosure, merge notes
docker-compose.yml        db + api + web
.env.example              environment template
```

## Who works where

| Area | Frontend | Backend |
|---|---|---|
| Store Manager | `apps/web/src/features/store-manager` | `apps/api/src/orders`, `apps/api/src/receipts` |
| Dispatcher + allocation | `apps/web/src/features/dispatcher` | `apps/api/src/planning`, `trips`, `fleet`, `outlets` |
| Loader | `apps/web/src/features/loader` | `apps/api/src/loading` |
| Driver + offline | `apps/web/src/features/driver` | `apps/api/src/delivery`, `apps/api/src/sync` |
| Platform | `apps/web/src/app`, `src/api` | `apps/api/src/auth`, `users`, `prisma/`, Docker |

Schema changes: edit `apps/api/prisma/schema.prisma`, create a migration, and coordinate with the DB owner
before merging. See [docs/architecture.md](docs/architecture.md) for the swap seam from mock data to the API.

## Judge walkthrough

_To be completed once the backend flows are connected._ Planned outline:

1. Store Manager places an order and notes the order ID.
2. Dispatcher finds the same order, sees an invalid vehicle rejected with a reason, allocates correctly and publishes.
3. Loader opens the trip, reports a shortfall, and marks ready after the dispatcher decision.
4. Driver opens the trip, records arrival, outcome and proof of delivery, including one offline update.
5. Store Manager confirms receipt or reports an issue.
6. Dispatcher reviews completed history and deferral evidence.

## Departures from the Designathon submission

_To be completed by module owners._ Merge-level changes are in [docs/merge-notes.md](docs/merge-notes.md).

## Documentation

- [API and workflow contract v1](docs/api-contract-v1.md) — agreed rules, shared DTOs, endpoint ownership,
  and required schema changes; endpoints remain implementation work.
- [Architecture](docs/architecture.md)
- [Data model](docs/data-model.md)
- [AI tool disclosure](docs/ai-disclosure.md)
- [Merge notes](docs/merge-notes.md)
