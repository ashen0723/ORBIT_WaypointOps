# Data model

## Demo allocation fixtures

The idempotent seed supplies four outlets, five vehicles and five allocation orders with prototype
IDs. New orders have requested/planned date **2026-10-05**, status `CONFIRMED`, and the persisted
dispatcher account as creator (resolved by email). Reruns update fixture loads but preserve order
dates/status and allocations; use fresh fixtures for independent tests.

| Order | Candidate / expected case |
|---|---|
| `ORD-DEMO-CHILLED` | `TRK-021`: feasible; `TRK-041`: wrong depot; `TRK-030`: incompatible temperature |
| `ORD-DEMO-AMBIENT` | `TRK-030`: feasible; `TRK-024`: unavailable |
| `ORD-DEMO-VAN` | `VAN-012`: feasible; `TRK-021`: van-only access rejection |
| `ORD-DEMO-WEIGHT` | `TRK-021`: 1001 kg exceeds 1000 kg; volume fits |
| `ORD-DEMO-VOLUME` | `TRK-021`: 18.1 m³ exceeds 18 m³; weight fits |

`OUT-005` supplies Peliyagoda van-only access; `OUT-014` supplies Kandy reference coverage.
`OUT-005` uses demo `STREET` dock semantics, not an official mapping of the mock's rear lane.
Fixtures cover first-pass suitability/capacity without calendar, frozen goods or route estimates.

Source of truth: [`apps/api/prisma/schema.prisma`](../apps/api/prisma/schema.prisma) (draft; owners refine
fields through migrations). Initial migration: `apps/api/prisma/migrations/0001_init`.

```mermaid
erDiagram
  Depot ||--o{ Outlet : serves
  Depot ||--o{ Vehicle : "home of"
  Depot ||--o{ User : "staffs"
  Depot ||--o{ Trip : dispatches
  Outlet ||--o{ Order : places
  Outlet ||--o{ User : "managed by"
  Vehicle ||--o{ Trip : runs
  Vehicle ||--o{ User : "driven by"
  User ||--o{ Order : creates
  Order ||--|{ OrderLine : contains
  Order ||--o| TripStop : "assigned to"
  Trip ||--|{ TripStop : "ordered stops"
  Trip ||--o| LoadingRecord : "loaded via"
  LoadingRecord ||--o{ LoadingIssue : raises
  OrderLine ||--o{ LoadingIssue : "short/damaged"
  User ||--o{ LoadingRecord : checks
  TripStop ||--o| Delivery : outcome
  Delivery ||--o| ProofOfDelivery : evidence
  Delivery ||--o| Receipt : "confirmed by store"
  Receipt ||--o{ ReceiptIssue : reports
  OrderLine ||--o{ ReceiptIssue : concerns
  User ||--o{ Receipt : confirms
  User ||--o{ AuditEvent : "acts in"
  User ||--o{ SyncAction : queues

  Depot { string id PK "DEP-PLG, DEP-KDY" string name }
  User { string id PK string email UK Role role string passwordHash string outletId FK string depotId FK string vehicleId FK }
  Outlet { string id PK Brand brand string district string depotId FK DockType dockType ParkingConstraint parkingConstraint string mallWindow string windowOpenTime string windowCloseTime }
  Vehicle { string id PK VehicleType type VehicleTemp temp float weightCapKg float volumeCapM3 float kmPerL float weeklyFuelQuotaL string depotId FK boolean available }
  Order { string id PK string outletId FK date requestedDate date plannedDate TempRequirement temp int units float weightKg float volumeM3 OrderStatus status int deferralCount string deferReason date deferredToDate }
  OrderLine { string id PK string orderId FK string item int requestedQty int loadedQty int deliveredQty }
  Trip { string id PK string vehicleId FK date date int tripNo "unique per vehicle+date" TripStatus status float totalWeightKg float totalVolumeM3 }
  TripStop { string id PK string tripId FK string orderId UK int sequence string etaTime StopStatus status }
  LoadingRecord { string id PK string tripId UK string checkedById FK LoadingRecordStatus status }
  LoadingIssue { string id PK LoadingIssueType type int expectedQty int availableQty string decision LoadingIssueStatus status }
  Delivery { string id PK string stopId UK StopStatus outcome string reason string clientActionId UK }
  ProofOfDelivery { string id PK string deliveryId UK string recipientName string signatureRef string photoRef }
  Receipt { string id PK string deliveryId UK ReceiptStatus status }
  ReceiptIssue { string id PK string issueType string note string photoRef }
  AuditEvent { string id PK string entityType string entityId string action json payload }
  SyncAction { string id PK string clientActionId UK string actionType json payload SyncStatus status int retryCount }
```

## Key rules encoded in the schema

| Rule | Where |
|---|---|
| A vehicle runs at most two numbered trips per day | `Trip @@unique([vehicleId, date, tripNo])`; the 2-trip cap itself is enforced by the planning service |
| An order is on at most one active stop | `TripStop.orderId @unique` |
| Stop sequence is unique within a trip | `TripStop @@unique([tripId, sequence])` |
| Offline actions are idempotent | `SyncAction.clientActionId @unique`, `Delivery.clientActionId @unique` |
| Failed outcome is kept; recovery is recorded separately | `Delivery.outcome` + `AuditEvent` history |
| Evidence is stored as references, not browser preview URLs | `ProofOfDelivery.signatureRef/photoRef`, `ReceiptIssue.photoRef` |

## Status enums

- `OrderStatus`: CONFIRMED → PLANNED → LOADING → READY → IN_TRANSIT → DELIVERED → RECEIVED, or DEFERRED
- `TripStatus`: DRAFT → CONFIRMED → LOADING → READY → IN_TRANSIT → COMPLETED / COMPLETED_WITH_EXCEPTIONS
- `StopStatus`: PLANNED → ARRIVED → DELIVERED / PARTIAL / FAILED / RESCHEDULED
- `LoadingIssueStatus`: OPEN → REPLACEMENT_LOADED / SHIP_SHORT / RESOLVED
- `SyncStatus`: PENDING_SYNC → SYNCING → SYNCED / CONFLICT / FAILED
- `ReceiptStatus`: PENDING → CONFIRMED / CONFIRMED_WITH_ISSUE
