/** Compile-time examples: invalid wire shapes must remain rejected. Never executed. */
import type {
  DeliveryOutcomePayload, LoadingDecisionRequest, PlanInput, ReceiverProof,
  RecordOutcomeRequest, SyncActionResult, TripView, ValidatePlanResponse,
} from '../src';

export const plan = {
  date: '2026-10-05', depotId: 'DEP-PLG', vehicleId: 'VEH014',
  plannedDeparture: '05:00', orderIds: ['ORDER-EXAMPLE'],
} satisfies PlanInput;

export const shipShort = {
  clientActionId: 'decision-1', expectedVersion: 1, expectedPlanVersion: 1,
  decision: { action: 'SHIP_SHORT', approvedLoadedQty: 16, reason: 'Four cartons unavailable; cancel four.' },
} satisfies LoadingDecisionRequest;

export const signatureException = {
  recipientName: 'Receiver', signatureRef: null,
  photoRefs: ['evidence-1'], signatureExceptionReason: 'Receiver unable to sign.',
} satisfies ReceiverProof;

export const partialDelivery = {
  clientActionId: 'delivery-1', expectedPlanVersion: 2, capturedAt: '2026-10-05T01:00:00Z',
  delivery: {
    outcome: 'PARTIAL', reason: 'Two cartons damaged and returned.', damageReported: true,
    lines: [{ orderLineId: 'line-1', deliveredQty: 14, returnedQty: 2 }],
    proof: { recipientName: 'Receiver', signatureRef: 'signature-1', photoRefs: ['damage-1'] },
  },
} satisfies RecordOutcomeRequest;

export const failedDelivery = {
  outcome: 'FAILED', reason: 'Outlet closed', photoRefs: ['closed-outlet-1'],
  lines: [{ orderLineId: 'line-1', deliveredQty: 0, returnedQty: 16 }],
} satisfies DeliveryOutcomePayload;

export const blockedPlan = {
  valid: false, evaluatedAt: '2026-10-04T08:00:00Z', totals: null, stops: [],
  reasons: [{ code: 'REEFER_REQUIRED', field: 'vehicleId', entityId: 'VEH014', message: 'Select a reefer.' }],
} satisfies ValidatePlanResponse;

// @ts-expect-error Plan must contain at least one order.
export const emptyPlan: PlanInput = { ...plan, orderIds: [] };
// @ts-expect-error A third numbered trip is outside the contract.
export const thirdTrip: TripView['tripNo'] = 3;
// @ts-expect-error Missing signature requires photo evidence.
export const noEvidence: ReceiverProof = { recipientName: 'Receiver', signatureRef: null, photoRefs: [], signatureExceptionReason: 'Refused' };
// @ts-expect-error A failed delivery needs attempt photo evidence.
export const failedWithoutPhoto: DeliveryOutcomePayload = { ...failedDelivery, photoRefs: [] };
// @ts-expect-error Failed attempts do not claim a receiver handover signature.
export const failedWithReceiver: DeliveryOutcomePayload = { ...failedDelivery, proof: signatureException };
// @ts-expect-error Shortfall cannot be approved without a reason.
export const silentCancellation: LoadingDecisionRequest['decision'] = { action: 'SHIP_SHORT', approvedLoadedQty: 16 };
// @ts-expect-error A field action must identify the plan version it was captured against.
export const unversioned: RecordOutcomeRequest = { clientActionId: 'x', capturedAt: '2026-10-05T01:00:00Z', delivery: failedDelivery };
// @ts-expect-error Invalid preview must explain at least one violation.
export const silentFailure: ValidatePlanResponse = { valid: false, evaluatedAt: '2026-10-04T08:00:00Z', totals: null, stops: [], reasons: [] };
// @ts-expect-error Conflict acknowledgement cannot claim lost evidence was preserved.
export const lostEvidence: SyncActionResult = { clientActionId: 'x', status: 'CONFLICT', conflictId: 'c', evidencePreserved: false, error: { code: 'PLAN_CHANGED', message: 'Review required', details: [] } };
