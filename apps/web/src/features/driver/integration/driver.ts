import type { DriverTrip, DeliveryOutcome, DeliveryStatus, SyncState } from '../types/driver';
import type { DriverPhoto } from '../components/driver/DriverPhotoCapture';

export interface DriverIdentity { name: string; email: string; avatar: string; vehicle: string; vehicleType: string; depot: string; date: string }

export interface DeliveryDraft {
  outcome: DeliveryOutcome;
  quantities: Record<string, number>;
  reason?: string;
  recipient?: string;
  signature?: string;
  photos: DriverPhoto[];
}
export interface StopRecord {
  status: DeliveryStatus;
  arrivedAt?: string;
  completedAt?: string;
  outcome?: DeliveryOutcome;
  syncState?: SyncState;
  photoCount: number;
  delivery?: DeliveryDraft;
}
export interface PendingAction {
  id: string;
  tripId: string;
  sequence?: number;
  kind: 'departure' | 'arrival' | 'outcome' | 'issue';
  state: SyncState;
  message?: string;
}
export type DriverAction =
  | { kind: 'departure'; tripId: string }
  | { kind: 'arrival'; tripId: string; sequence: number; stopId?: string; orderId?: string; at: string }
  | { kind: 'outcome'; tripId: string; sequence: number; stopId?: string; orderId?: string; at: string; delivery: DeliveryDraft }
  | { kind: 'issue'; tripId: string; sequence?: number; reason: string; notes: string; photos: DriverPhoto[] };
/** Kuru supplies cached shared records and queue snapshots. Acceptance must follow durable save. */
export interface DriverIntegration {
  getSnapshot(): { assignment?: DriverIdentity; trips: DriverTrip[]; stopRecords: Record<string, StopRecord>; departedTrips: Record<string, boolean>; actions: PendingAction[]; lastSyncedAt: string };
  subscribe(listener: () => void): () => void;
  submit(action: DriverAction): Promise<SyncState>;
  retryAction(id: string): Promise<void>;
  acknowledgeConflict(id: string): Promise<void>;
}
export const resolvedStatuses: DeliveryStatus[] = ['Delivered', 'Partially delivered', 'Failed', 'Changed by dispatcher'];
export function validateDelivery(items: DriverTrip['stops'][number]['items'], draft: DeliveryDraft): string | null {
  if (draft.outcome !== 'full' && !draft.reason?.trim()) return 'Choose a reason.';
  if (draft.outcome !== 'failed' && (!draft.recipient?.trim() || !draft.signature)) return 'Recipient and signature are required.';
  const values = items.map(item => draft.quantities[item.id]);
  if (values.some((value, index) => !Number.isInteger(value) || value < 0 || value > (items[index].loaded ?? items[index].planned))) return 'Delivered quantities must be whole numbers within the available load.';
  if (draft.outcome === 'failed' && values.some(value => value !== 0)) return 'Failed deliveries must have zero delivered quantities.';
  if (draft.outcome === 'full' && values.some((value, index) => value !== items[index].planned)) return 'A load shortfall requires a partial outcome.';
  if (draft.outcome === 'partial' && (!values.some(value => value > 0) || !values.some((value, index) => value < items[index].planned))) return 'Partial delivery needs delivered items and a shortage. Use full or failed otherwise.';
  return null;
}
