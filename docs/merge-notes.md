# Merge notes — Designathon prototypes → monorepo


## Source → destination

| Prototype zip (Magic Patterns) | Destination | Mounted at | Entry component |
|---|---|---|---|
| `Dispatcher.zip` (team leader; also contains Login, session and the in-browser mock server) | `apps/web/src/features/dispatcher/` | `/dispatcher` | `App` |
| `StockManager.zip` | `apps/web/src/features/store-manager/` | `/store` | `App` |
| `Loader.zip` | `apps/web/src/features/loader/` | `/loader` | `App` |
| `Driver.zip` | `apps/web/src/features/driver/` | `/driver` | `DriverApp` |

Each `src/` tree was copied byte-for-byte (verified with `diff -r`); `public/` folders were merged (no name
conflicts). Shared configs (`tailwind.config.js`, `vite.config.ts`, `tsconfig*.json`, `.eslintrc.cjs`,
`index.css`) were identical across all four and now live once in `apps/web/`.

## The only edits made to teammates' code

1. **`basename` prop** on each module's root router:
   `features/dispatcher/App.tsx`, `features/store-manager/App.tsx`, `features/loader/App.tsx`, `features/driver/DriverApp.tsx`.
2. **Dispatcher `App.tsx` no longer creates its own `SessionProvider`** — the root (`src/app/App.tsx`) provides
   the one shared session.
3. **Sign out now really signs out** (was a "Prototype only — sign-in isn't connected" toast):
   `features/store-manager/components/layout/AppShell.tsx`, `features/loader/components/layout/AppShell.tsx`,
   `features/driver/components/layout/AppShell.tsx`, `features/driver/components/driver/DriverNav.tsx`.
   In the three `AppShell.tsx` files the toast text also changed to plain "Signed out", since the old
   "Prototype only" description became false (approved by the team).

No bugs were fixed and nothing was deleted.

## Kept as-is (cleanup candidates for each owner)

- Store Manager pages copied inside Loader and Driver (`features/loader/pages/{PlaceOrder,OrderStatus,...}`,
  `features/driver/pages/{PlaceOrder,...}`) — they are the fork base, some lightly edited. Reachable only inside
  those modules (e.g. `/loader/place-order`).
- `features/driver/App.tsx` — the inherited Store Manager app; not used (Driver entry is `DriverApp.tsx`).
- Leader's own Store/Driver/Loading pages inside Dispatcher (`features/dispatcher/pages/store/*`,
  `pages/driver/*`, `pages/Loading*.tsx`) — routes guarded for other roles, so unreachable now that each role
  gets its own module. Dispatcher's `/loading` view stays useful for dispatchers.
- Per-module `index.tsx`, `index.css`, `src/package.json` (Magic Patterns artefact), `canvas.manifest.js`,
  `useScreenInit.js` — unused by the merged entry, harmless.
- Leader's in-browser mock server `features/dispatcher/server/*` — still powers login and dispatcher data;
  it is the reference implementation for the NestJS modules.

## Known issues (not fixed, by agreement)

- Loader URLs read `/loader/loader/...` because its routes already start with `loader/`.
- `npm run typecheck -w apps/web` reports ~399 pre-existing errors in teammates' code (mostly unused `React`
  imports; dispatcher files referencing removed types such as `Deferral`, `ForecastDay`; `useScreenInit.js`
  without type declarations; lucide icon prop types). `npm run build` does not type-check, matching the
  prototypes. Zero errors in merge-owned files (`src/app`, `src/api`, `src/guards`, `src/main.tsx`).
- Store, Loader and Driver modules still use their own mock data, so roles do not share live data yet.
- A toast fired in one module (e.g. "Signed out") can appear after switching role in the same tab.
- Production bundle is ~970 kB (Vite warns >500 kB); code-splitting per role is a later improvement.

## Decisions and deviations

| Topic | Decision |
|---|---|
| Layout | Starter pack's `apps/web`, `apps/api`, `packages/contracts`; Prisma lives in `apps/api/prisma` (not repo root) so the API image is self-contained. Teammates' `frontend/src/features` vocabulary adopted. |
| NestJS version | 11.x (stable CommonJS) rather than 12.x, to reduce risk before the Day 10 deadline. |
| Prisma 7 | `prisma-client` generator → `apps/api/src/generated/prisma` (gitignored, generated at build), `moduleFormat = "cjs"`, `importFileExtension = "js"`, `@prisma/adapter-pg`, `prisma.config.ts`. |
| Demo accounts | Prototype accounts kept (`*@waypoint.lk`, password `waypoint-demo`); the starter pack mentioned `@waypoint.demo`. |
| Depot ids | `DEP-PLG`, `DEP-KDY` (prototype ids) so DB and UI agree. |
| Datasets | Official `outlets.csv`, `vehicles.csv`, `calendar.csv` were not in the repo; the seed creates only depots, the two store outlets, vehicle `TRK-021` and the five demo users. |
| Signup | None. No prototype had a signup page; the booklet requires seeded accounts only. |

## Not verified on the merge machine

- `docker compose up --build` (Docker not installed there). Must be run by a teammate before submission.
- `prisma migrate deploy` and the seed against a live database (no Postgres there). The seed was type-checked
  and ran up to its first query.
