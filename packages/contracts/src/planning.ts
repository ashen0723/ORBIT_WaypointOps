import type { BusinessDate, ErrorDetail, Id, Instant, LocalTime, Mutation, NonEmptyList, OrderView, PlanMutation, TripView, VersionedMutation } from './domain';

export type PlanningFailureCode =
  | 'DEPOT_MISMATCH' | 'WEIGHT_EXCEEDED' | 'VOLUME_EXCEEDED'
  | 'REEFER_REQUIRED' | 'VAN_REQUIRED' | 'WINDOW_CONFLICT' | 'FRESH_DEADLINE'
  | 'FUEL_QUOTA_EXCEEDED' | 'TRIP_LIMIT' | 'VEHICLE_CONFLICT'
  | 'DUPLICATE_ASSIGNMENT' | 'VEHICLE_UNAVAILABLE' | 'NON_OPERATING_DATE'
  | 'REFERENCE_DATA_MISSING' | 'ORDER_NOT_ELIGIBLE' | 'DRIVER_NOT_CONFIGURED' | 'INVALID_SEQUENCE';
export interface PlanningReason extends ErrorDetail { code: PlanningFailureCode }
export interface PlanningTotals {
  weightKg: number;
  volumeM3: number;
  /** Includes return to depot; this is NOT the Datathon Task 2B time formula. */
  distanceKm: number;
  estimatedFuelL: number;
  durationMin: number;
  remainingWeeklyFuelL: number;
  existingTripsOnDate: number;
}
export interface PlannedStop {
  orderId: Id;
  sequence: number;
  arrivalAt: Instant;
  serviceStartAt: Instant;
  departureAt: Instant;
}
/** Initial whole orders or outstanding quantities authorized by a stored recovery decision. */
export interface PlanInput {
  date: BusinessDate;
  depotId: Id;
  vehicleId: Id;
  plannedDeparture: LocalTime;
  /** Ordered, unique list. UI chooses sequence; server calculates and validates it. */
  orderIds: NonEmptyList<Id>;
}
export interface ValidatePlanRequest {
  plan: PlanInput;
  /** Editing an existing trip: exclude its own reservations, verify its version. */
  replacingTrip?: { tripId: Id; expectedPlanVersion: number };
}
interface ValidationBase {
  evaluatedAt: Instant;
  totals: PlanningTotals | null;
  stops: PlannedStop[];
}
export type ValidatePlanResponse =
  | (ValidationBase & { valid: true; totals: PlanningTotals; reasons: [] })
  | (ValidationBase & { valid: false; reasons: NonEmptyList<PlanningReason> });

export interface SaveDraftRequest extends Mutation { plan: PlanInput }
export interface UpdateDraftRequest extends VersionedMutation { plan: PlanInput }
/** A draft is NOT a Trip and holds no orders, trip slots or fuel reservations. */
export interface PlanDraftView { id: Id; version: number; plan: PlanInput; updatedAt: Instant; allocatedTripId: Id | null }
export interface AllocatePlanRequest extends Mutation {
  draftId: Id;
  expectedDraftVersion: number;
}
export interface AllocatePlanResponse { trip: TripView }
export interface AmendPlanRequest extends Mutation {
  expectedPlanVersion: number;
  plan: PlanInput;
  reason: string;
}
export interface PublishPlansRequest extends Mutation {
  trips: NonEmptyList<{ tripId: Id; expectedPlanVersion: number }>;
}
export interface PublishPlansResponse { trips: TripView[] }
export interface ReleaseAllocationRequest extends Mutation {
  expectedPlanVersion: number;
  reason: string;
}
export interface ReleaseAllocationResponse { tripId: Id; releasedAt: Instant; orders: OrderView[] }
export interface DeferOrderRequest extends VersionedMutation {
  orderId: Id;
  nextDate: BusinessDate;
  reason: string;
}
export interface DeferralView {
  id: Id;
  orderId: Id;
  fromDate: BusinessDate | null;
  toDate: BusinessDate;
  reason: string;
  actorId: Id;
  recordedAt: Instant;
}
export interface DeferOrderResponse { order: OrderView; deferral: DeferralView }
/** In-transit intent: preserve active assignment until goods/outcome are reconciled. */
export interface RescheduleStopRequest extends PlanMutation { nextDate: BusinessDate; reason: string }
export interface AcknowledgeStopRescheduleRequest extends PlanMutation {
  returnedAt: Instant;
  lines: NonEmptyList<{ orderLineId: Id; returnedQty: number }>;
}

/** Mark a vehicle unavailable for the trip day; stop loading until the plan is amended. */
export interface ReportVehicleUnavailableRequest extends PlanMutation { reason: string }
