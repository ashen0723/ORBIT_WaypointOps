/** Wire contracts v1; see docs/api-contract-v1.md. Types are NOT runtime validators. */
import type { Role } from './roles';

export type Id = string;
/** YYYY-MM-DD, interpreted as an Asia/Colombo business date. */
export type BusinessDate = string;
/** RFC 3339 timestamp with timezone; responses normalize to UTC Z. */
export type Instant = string;
/** HH:MM in Asia/Colombo, paired with the trip's business date. */
export type LocalTime = string;
export type NonEmptyList<T> = [T, ...T[]];
export type Brand = 'FRESH' | 'STYLE' | 'TECH';
/** FROZEN is a v1 extension requiring a Prisma migration before use. */
export type TemperatureRequirement = 'AMBIENT' | 'CHILLED' | 'FROZEN';
export type VehicleTemperature = 'AMBIENT' | 'REEFER';
export type VehicleType = 'TRUCK' | 'VAN';
export type OrderStatus = 'CONFIRMED' | 'PLANNED' | 'LOADING' | 'READY' | 'IN_TRANSIT' | 'DELIVERED' | 'RECEIVED' | 'DEFERRED';
export type TripStatus = 'DRAFT' | 'CONFIRMED' | 'LOADING' | 'READY' | 'IN_TRANSIT' | 'COMPLETED' | 'COMPLETED_WITH_EXCEPTIONS';
export type StopStatus = 'PLANNED' | 'ARRIVED' | 'DELIVERED' | 'PARTIAL' | 'FAILED' | 'RESCHEDULED';
export type DeliveryOutcome = Extract<StopStatus, 'DELIVERED' | 'PARTIAL' | 'FAILED'>;
export type LoadingIssueStatus = 'OPEN' | 'REPLACEMENT_LOADED' | 'SHIP_SHORT' | 'RESOLVED';
export type ReceiptStatus = 'PENDING' | 'CONFIRMED' | 'CONFIRMED_WITH_ISSUE';
export type SyncStatus = 'PENDING_SYNC' | 'SYNCING' | 'SYNCED' | 'CONFLICT' | 'FAILED';

export interface SessionUser {
  id: Id;
  name: string;
  email: string;
  /** Existing browser Role spelling; map from the uppercase database enum. */
  role: Role;
  outletId: Id | null;
  depotId: Id | null;
  vehicleId: Id | null;
}
export interface LoginRequest { email: string; password: string }
export interface LoginResponse { token: string; expiresAt: Instant; user: SessionUser }

export interface ErrorDetail {
  code: string;
  field: string | null;
  entityId: Id | null;
  message: string;
  actual?: number;
  limit?: number;
}
export interface ApiErrorBody { code: string; message: string; details: ErrorDetail[] }
export interface Page<T> { items: T[]; nextCursor: string | null }
/** Generate once per user intent; retry unchanged with the same key. */
export interface Mutation { clientActionId: Id }
export interface VersionedMutation extends Mutation { expectedVersion: number }
export interface PlanMutation extends Mutation { expectedPlanVersion: number }
export interface AuditStamp { actorId: Id; recordedAt: Instant; reason: string | null }

export interface OrderLineView {
  id: Id;
  item: string;
  unit: string;
  requestedQty: number;
  /** Approved warehouse shortfall cancellation; never reduce requestedQty. */
  cancelledQty: number;
  /** Cumulative accepted deliveries; each attempt retains its own quantities. */
  deliveredQty: number;
}
export interface OrderView {
  id: Id;
  version: number;
  outletId: Id;
  brand: Brand;
  temp: TemperatureRequirement;
  requestedDate: BusinessDate;
  plannedDate: BusinessDate | null;
  status: OrderStatus;
  units: number;
  weightKg: number;
  volumeM3: number;
  lines: OrderLineView[];
  activeTripId: Id | null;
  attemptStopIds: Id[];
  recoveryPending: boolean;
  deferralCount: number;
  deferReason: string | null;
  deferredToDate: BusinessDate | null;
}
export interface TripLineView {
  orderLineId: Id;
  version: number;
  /** Quantity assigned to THIS attempt, not the original order total. */
  plannedQty: number;
  cancelledQty: number;
  loadedQty: number | null;
  deliveredQty: number | null;
  returnedQty: number | null;
}
export interface TripStopView {
  id: Id;
  orderId: Id;
  outletId: Id;
  sequence: number;
  status: StopStatus;
  plannedArrivalAt: Instant;
  arrivedAt: Instant | null;
  reschedule: {
    nextDate: BusinessDate;
    reason: string;
    requestedAt: Instant;
    requestedById: Id;
    acknowledgedAt: Instant | null;
  } | null;
  lines: TripLineView[];
}
export interface TripView {
  id: Id;
  version: number;
  planVersion: number;
  vehicleId: Id;
  /** Snapshot of the vehicle's driver; no independent availability optimizer. */
  driverId: Id;
  depotId: Id;
  date: BusinessDate;
  tripNo: 1 | 2;
  status: TripStatus;
  publishedAt: Instant | null;
  loaderAcknowledgedPlanVersion: number | null;
  plannedDepartureAt: Instant;
  plannedReturnAt: Instant;
  totalWeightKg: number;
  totalVolumeM3: number;
  estimatedDistanceKm: number;
  reservedFuelL: number;
  stops: TripStopView[];
}
export interface VehicleView {
  id: Id;
  depotId: Id;
  driverId: Id | null;
  type: VehicleType;
  temp: VehicleTemperature;
  weightCapKg: number;
  volumeCapM3: number;
  kmPerL: number;
  weeklyFuelQuotaL: number;
  availableOnDate: boolean;
  fuelWeekStart: BusinessDate;
  committedFuelL: number;
  reservedFuelL: number;
  remainingFuelL: number;
  allocatedTripCountOnDate: number;
}
