import type {
  BusinessDate, DeliveryOutcome, Id, Instant, LoadingIssueStatus, Mutation,
  NonEmptyList, OrderView, PlanMutation, ReceiptStatus, TemperatureRequirement,
  TripView, VersionedMutation, ApiErrorBody,
} from './domain';

export interface CreateOrderRequest extends Mutation {
  requestedDate: BusinessDate;
  temp: TemperatureRequirement;
  /** Server resolves catalog labels/unit/weight/volume; outlet/brand come from user. */
  lines: NonEmptyList<{ catalogItemId: Id; requestedQty: number }>;
}
export interface CreateOrderResponse {
  order: OrderView;
  receivedAt: Instant;
  cutoffApplied: boolean;
  schedulingMessage: string | null;
}
export interface CatalogItemView {
  id: Id;
  name: string;
  unit: string;
  temp: TemperatureRequirement;
  unitWeightKg: number;
  unitVolumeM3: number;
}
export interface LoadingLineRequest extends VersionedMutation {
  expectedPlanVersion: number;
  loadedQty: number;
}
export interface ReportLoadingIssueRequest extends PlanMutation {
  orderLineId: Id;
  type: 'MISSING' | 'DAMAGED';
  availableQty: number;
  note: string;
  photoRefs: Id[];
}
export type LoadingDecision =
  | { action: 'REPLACEMENT_REQUIRED'; reason: string }
  | { action: 'SHIP_SHORT'; approvedLoadedQty: number; reason: string };
export interface LoadingDecisionRequest extends VersionedMutation {
  expectedPlanVersion: number;
  decision: LoadingDecision;
}
export interface LoadingIssueView {
  note?: string | null;
  photoRefs?: Id[];
  id: Id;
  version: number;
  tripId: Id;
  planVersion: number;
  orderLineId: Id;
  type: 'MISSING' | 'DAMAGED';
  expectedQty: number;
  availableQty: number;
  status: LoadingIssueStatus;
  decision: LoadingDecision | null;
  decidedById: Id | null;
  decidedAt: Instant | null;
  acknowledgedById: Id | null;
  acknowledgedAt: Instant | null;
  cancelledQty: number;
}
export interface AcknowledgeLoadingIssueRequest extends VersionedMutation { expectedPlanVersion: number }
export interface LoadingView { trip: TripView; issues: LoadingIssueView[]; vehicleAvailable?: boolean }

/** Uploaded, access-controlled durable references; never blob: URLs. */
export type ReceiverProof =
  | { recipientName: string; signatureRef: Id; photoRefs: Id[]; signatureExceptionReason?: never }
  | { recipientName: string; signatureRef: null; photoRefs: NonEmptyList<Id>; signatureExceptionReason: string };
export interface AttemptQuantities {
  orderLineId: Id;
  /** Accepted by the outlet on THIS attempt. */
  deliveredQty: number;
  /** Loaded but not accepted; returned to depot, including damaged/refused goods. */
  returnedQty: number;
}
export type DeliveryOutcomePayload =
  | { outcome: 'DELIVERED'; lines: NonEmptyList<AttemptQuantities>; proof: ReceiverProof; reason?: never; damageReported: false }
  | { outcome: 'PARTIAL'; lines: NonEmptyList<AttemptQuantities>; proof: ReceiverProof; reason: string; damageReported: boolean }
  | { outcome: 'FAILED'; lines: NonEmptyList<AttemptQuantities>; reason: string; photoRefs: NonEmptyList<Id>; proof?: never };
export interface RecordArrivalRequest extends PlanMutation { capturedAt: Instant }
export interface RecordOutcomeRequest extends PlanMutation { capturedAt: Instant; delivery: DeliveryOutcomePayload }
export interface DeliveryView {
  id: Id;
  stopId: Id;
  orderId: Id;
  version: number;
  outcome: DeliveryOutcome;
  recorded: DeliveryOutcomePayload;
  capturedAt: Instant;
  recordedAt: Instant;
  requiresDispatcherReview: boolean;
  /** When the driver arrived at the stop for this attempt (optional; list views include it). */
  arrivedAt?: Instant | null;
}
export interface ReceiptLineInput {
  orderLineId: Id;
  acceptedQty: number;
  damagedQty: number;
  missingQty: number;
  note: string | null;
  photoRefs: Id[];
}
export interface ConfirmReceiptRequest extends Mutation {
  expectedDeliveryVersion: number;
  lines: NonEmptyList<ReceiptLineInput>;
}
export interface ReceiptView {
  id: Id;
  deliveryId: Id;
  status: Exclude<ReceiptStatus, 'PENDING'>;
  lines: ReceiptLineInput[];
  confirmedAt: Instant;
  confirmedById: Id;
}
/** Warehouse-cancelled quantities are never eligible for these recovery actions. */
export type RecoveryDecision =
  | { action: 'REDELIVER'; lines: NonEmptyList<{ orderLineId: Id; qty: number }>; nextDate: BusinessDate; reason: string }
  | { action: 'CLOSE_WITHOUT_REDELIVERY'; lines: NonEmptyList<{ orderLineId: Id; qty: number }>; reason: string };
export interface RecoveryDecisionRequest extends VersionedMutation { decision: RecoveryDecision }
export interface RecoveryView {
  /** Updated Delivery.version for the next decision on this source attempt. */
  sourceDeliveryVersion: number;
  id: Id;
  sourceDeliveryId: Id;
  decision: RecoveryDecision;
  decidedById: Id;
  decidedAt: Instant;
  retryStopId: Id | null;
}
export interface ReportDriverIssueRequest extends PlanMutation {
  tripId: Id;
  stopId: Id | null;
  capturedAt: Instant;
  type: 'BREAKDOWN' | 'DELAY' | 'ROAD_BLOCKED' | 'REFRIGERATION' | 'OUTLET_CLOSED' | 'ACCIDENT' | 'OTHER';
  note: string;
  photoRefs: Id[];
}
export interface DriverIssueView extends ReportDriverIssueRequest { id: Id; reportedById: Id; recordedAt: Instant }

export type FieldAction =
  | { kind: 'ARRIVE'; stopId: Id; request: RecordArrivalRequest }
  | { kind: 'OUTCOME'; stopId: Id; request: RecordOutcomeRequest }
  | { kind: 'ISSUE'; request: ReportDriverIssueRequest };
export interface SyncActionsRequest { actions: NonEmptyList<FieldAction> }
export type SyncActionResult =
  | { clientActionId: Id; status: 'SYNCED'; replayed: boolean; entityId: Id; recordedAt: Instant }
  | { clientActionId: Id; status: 'CONFLICT'; conflictId: Id; evidencePreserved: true; error: ApiErrorBody }
  | { clientActionId: Id; status: 'FAILED'; retryable: boolean; error: ApiErrorBody };
export interface SyncActionsResponse { results: SyncActionResult[] }
export interface FieldConflictView {
  id: Id;
  version: number;
  clientActionId: Id;
  action: FieldAction;
  currentPlanVersion: number;
  recordedAt: Instant;
  resolvedAt: Instant | null;
}
export type ResolveFieldConflictRequest = VersionedMutation & {
  resolution: 'ACCEPT_RECORDED_FACT' | 'RETAIN_FOR_INVESTIGATION';
  reason: string;
};
export interface EvidenceUploadResponse { evidenceId: Id; mediaType: string; sizeBytes: number }

export interface RecoveryStateView {
  deliveryId: Id;
  version: number;
  lines: {orderLineId: Id; qty: number}[];
  /** Historical decisions do not store the delivery version at decision time. */
  decisions: Omit<RecoveryView, 'sourceDeliveryVersion'>[];
}
