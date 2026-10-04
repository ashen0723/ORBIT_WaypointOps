# Private reference dataset imports

The importer loads Outlet, Vehicle and global OperatingDay reference records. It is an explicit
maintenance CLI, separate from `prisma db seed` and Docker startup. It does not import users, orders,
trips or operational history, delete missing rows, or modify the database contract.

## Private files

Keep competition files and the real mapping outside the repository, preferably at absolute paths.
Never commit private rows, real mapping headers or raw import reports. Alternatively use the ignored
`.private-datasets/` or `private-data/` directories. The exact basenames `outlets.csv`, `vehicles.csv`,
`calendar.csv`, `import-mapping.local.json` and `import-report.local.*` are ignored at any depth;
unrelated synthetic CSV fixtures remain visible.

Before committing, inspect `git status --short` and `git diff --cached`. Check whether a private file
is already tracked with `git ls-files --error-unmatch -- /path/to/file` (a successful result means
tracked). Check ignore behavior with `git check-ignore -v -- /path/to/file`. Ignore rules do not remove
already tracked files. Do not use force-add for private material.

## Mapping configuration

Copy `apps/api/prisma/import-mapping.example.json` to a private/local JSON file and replace every
placeholder using the actual source contract. The example shows structure only, not competition headers.
All three dataset mappings and file paths are required. UTF-8 is supported, including a UTF-8 BOM.

Each dataset has `csv: { "delimiter": ",", "encoding": "utf8" }` and a `fields` object keyed by the
actual Prisma destination field names. Every destination field must have exactly one of:

- `{"column": "<actual source header>"}`;
- `{"default": <explicit destination value>}` when the field is absent from the source.

IDs and calendar dates always require a column. Defaults never generate source IDs.
For a mapped optional field such as `mallWindow`, `onBlank: null` explicitly converts blank cells to
null. Otherwise blank cells are invalid. `mallWindow` must be null or `HH:mm-HH:mm` with a same-day
increasing interval. A default of null is also supported for a source without that field.

Enum and boolean columns require `values`, an explicit source-string -> destination-value object.
Destination enum values are:

| Field | Allowed destination values |
|---|---|
| Outlet.brand | FRESH, STYLE, TECH |
| Outlet.dockType | REAR_DOCK, STREET, MALL_BAY |
| Outlet.parkingConstraint | NORMAL, VAN_ONLY, MALL_DOCK |
| Vehicle.type | TRUCK, VAN |
| Vehicle.temp | REEFER, AMBIENT |

Boolean map destinations must be JSON `true`/`false`, not strings. There is no case normalization or
fallback mapping. Explicit `default`/`onBlank` values are already destination values; they still undergo
validation. For example, a source without vehicle availability may use `{"default": true}` only if
that assumption is approved. Existing vehicle availability is never overwritten.

Other required settings:

- Outlets: `timeFormat: "HH:mm"`; zero-padded 24-hour same-day delivery windows, opening before closing.
- Vehicles: `fuelEfficiencyUnit: "kmPerL"` or `"LPer100Km"` for the mapped `kmPerL` source column.
  The latter converts with `100 / sourceValue`; source values and the result must be finite and positive.
- Outlets and vehicles: `depotIds: {"mode": "identity"}` to use exact source depot IDs, or
  `{"mode": "map", "values": {"<source depot ID>": "<existing database Depot ID>"}}` for explicitly
  approved depot aliases. All target depots must exist; the importer never invents depots.
- Calendar: `scope: "global"`, and `dateFormat: "YYYY-MM-DD"` or `"DD/MM/YYYY"`. Dates become UTC
  midnight Date objects for PostgreSQL DATE, without local-time parsing. Invalid dates are rejected.

Unmapped headers are rejected. For outlets/vehicles only, `ignoreColumns` may explicitly name source
columns that have no v1 representation. Calendar permits only the mapped date and operating columns;
it cannot ignore a depot/scope column or silently collapse depot-specific semantics. A depot-specific
calendar must be reconciled outside this importer into an approved global input before use.
Unknown mapping properties, duplicate mappings and reused source columns fail validation.

## Dry run first

Run from the repository root using Node 22+ and installed workspace dependencies. Apply existing
migrations and generate Prisma Client first. The importer reads API/root `.env` files using the same
pattern as the seed; `DATABASE_URL` identifies the target database. Paths are resolved relative to the
API workspace working directory, so prefer absolute paths.

```bash
npm run db:import -w apps/api -- \
  --outlets /absolute/private/path/outlets.csv \
  --vehicles /absolute/private/path/vehicles.csv \
  --calendar /absolute/private/path/calendar.csv \
  --mapping /absolute/private/path/import-mapping.local.json
```

Dry-run is the default; `--dry-run` is also accepted. It parses, normalizes, validates the complete batch,
queries existing depots/reference rows, and writes nothing. Output contains `create`, `unchanged`,
`conflict`, and `invalid` counts. Problems identify dataset, record number where available, field and
error code rather than private cell values. Parse/header failures count as dataset-level invalid
problems; invalid row counts are not a complete cell-by-cell error inventory. No report file is created.
Any invalid row or conflict returns a nonzero exit status, and prevents application of the entire batch.

## Apply

After reviewing a successful dry-run against the intended database:

```bash
npm run db:import -w apps/api -- \
  --outlets /absolute/private/path/outlets.csv \
  --vehicles /absolute/private/path/vehicles.csv \
  --calendar /absolute/private/path/calendar.csv \
  --mapping /absolute/private/path/import-mapping.local.json \
  --apply
```

Only `--apply` can write. The importer rechecks depots and conflicts inside a serializable transaction,
using PostgreSQL transaction-level advisory lock key `(1869767284, 1)` to serialize cooperating importers.
It creates only absent records, atomically. Any constraint, timeout, serialization or connection error
fails the batch; there is no automatic retry or partial commit. Rerun the dry-run after concurrent changes.
The transaction timeout is 60 seconds. This framework targets bounded reference datasets, not bulk
multi-million-row imports.

## IDs, conflicts and demo separation

Official outlet/vehicle IDs are preserved exactly as strings, including case, zeros and punctuation.
Leading/trailing whitespace or control characters are rejected. No alias such as `OUT001 -> OUT-001`
or `VEH021 -> TRK-021` exists. Depot mapping is a separate, explicit foreign-key resolution choice.

Reserved demo outlet IDs are `OUT-001`, `OUT-002`, `OUT-005`, `OUT-014`; vehicle IDs are `TRK-021`,
`TRK-030`, `VAN-012`, `TRK-041`, `TRK-024`. Imports using these IDs fail, even when values match.
Review this reserved list when adding future demo fixtures.

For other source keys:

- Absent: CREATE.
- Same normalized destination fields: UNCHANGED; no write, including no updatedAt refresh.
- Any different destination field: CONFLICT; fail without overwriting it.

A repeat of the same batch is safe. Existing records missing from files are retained. Correcting an
existing record needs a separate reviewed maintenance action; this CLI has no overwrite option.
Demo calendar dates are not reserved, but differing values conflict just like other records.

Normal `prisma db seed` uses insert-only upserts, so it cannot overwrite imported
records. The importer never substitutes official rows for demo records. The current schema has no
provenance tag: demo and official records can coexist, but callers cannot filter by dataset source.
Use a dedicated migrated database without running the demo seed when an official-only environment is
required, and provision existing Depot references separately through an approved procedure. Do not
rename or delete seeded data to create apparent mappings.

## Tests

`npm run test:import -w apps/api -- --runInBand` uses synthetic CSV strings and mocked persistence only.
The full API test command includes both `src` and `prisma` tests. Competition files are never needed.
The mapping must be supplied by the dataset owner before a real import; headers, enum spellings,
units, depot aliases and global calendar semantics cannot be inferred from this framework.


### STYLE weekly schedule

Outlet mappings must include `scheduledWeekday`: ISO weekday 1 (Monday) through 6 (Saturday).
Map an authoritative numeric source column with `onBlank: null` for non-STYLE rows. STYLE rows without
a weekday, Sundays, fractions and out-of-range values are rejected before any writes. A null default
is permitted only when the source contains no STYLE outlets. The example mapping intentionally leaves
the source header as a placeholder; no official dataset headers or weekdays are guessed.

The importer uses the main `0001`–`0004` schema. The superseded branch-only workflow migration must not
be appended to that chain. See [DB seed reconciliation](data-model.md#db-seed--importer-reconciliation-pr-5)
for fixture details and isolated integration verification.
