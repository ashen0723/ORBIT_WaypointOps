import type { DeliveryOutcomePayload, FieldAction, OrderView, ReportDriverIssueRequest, TripView } from '@waypoint/contracts';
import { ApiError, apiFetch } from '../../../api/client';
import {
  cachedTrips, enqueue, flushQueue, pendingActions, readCached, removeAction, saveCached, saveTrips,
  type PendingAction as QueueEntry,
} from '../../operations/offline';
import type { DeliveryStatus, SyncState } from '../types/driver';
import type { DeliveryDraft, DriverAction, DriverIdentity, DriverIntegration, PendingAction, StopRecord } from './driver';
import { colomboTime, isDeparted, STOP_STATUS, toDriverTrip } from './mapping';
import { signatureToPng } from './signature';

type Snapshot = ReturnType<DriverIntegration['getSnapshot']>;
type Attachment = QueueEntry['attachments'][number];

interface DriverProfile {
  vehicle: { id: string; type: string; temp: string; depot: { id: string; name: string } } | null;
  depot: { id: string; name: string } | null;
}

export interface LiveDriverDeps {
  user: { id: string; name: string; email: string };
  token: string;
  /** Session expired or revoked on the server. */
  onUnauthorized?: () => void;
  rasterizeSignature?: (svg: string) => Promise<Blob>;
  isOnline?: () => boolean;
  newId?: () => string;
}

const EVIDENCE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_EVIDENCE_BYTES = 10 * 1024 * 1024;
const ISSUE_TYPE: Record<string, ReportDriverIssueRequest['type']> = {
  'Vehicle breakdown': 'BREAKDOWN',
  'Road blocked': 'ROAD_BLOCKED',
  'Refrigeration fault': 'REFRIGERATION',
  'Running late': 'DELAY',
  'Outlet closed': 'OUTLET_CLOSED',
  Accident: 'ACCIDENT',
};
const OUTCOME_STATUS: Record<DeliveryDraft['outcome'], DeliveryStatus> = { full: 'Delivered', partial: 'Partially delivered', failed: 'Failed' };
const KIND: Record<FieldAction['kind'], PendingAction['kind']> = { ARRIVE: 'arrival', OUTCOME: 'outcome', ISSUE: 'issue' };

/**
 * Driver UI ↔ NestJS adapter. Route data is cached in IndexedDB; arrival, outcome and issue actions are written to
 * the durable outbox before they are acknowledged, then replayed in capture order through POST /sync/actions with
 * their idempotency keys. Departure is online-only because the server has no queued depart action.
 */
export class LiveDriverIntegration implements DriverIntegration {
  private trips: TripView[] = [];
  private orders: Record<string, OrderView> = {};
  private profile: DriverProfile | null = null;
  private queue: QueueEntry[] = [];
  private lastSyncedAt = 'Not yet synced';
  private syncing = false;
  private inflight: Promise<void> | null = null;
  private again = false;
  private listeners = new Set<() => void>();
  private snapshot: Snapshot;
  private readonly online: () => boolean;
  private readonly newId: () => string;
  private readonly rasterize: (svg: string) => Promise<Blob>;

  constructor(private readonly deps: LiveDriverDeps) {
    this.online = deps.isOnline ?? (() => navigator.onLine);
    this.newId = deps.newId ?? (() => crypto.randomUUID());
    this.rasterize = deps.rasterizeSignature ?? signatureToPng;
    this.snapshot = this.build();
  }

  /**
   * Resolves once the route is usable: the IndexedDB cache is loaded, and — when the cache is empty and a
   * connection exists — the first server fetch has finished. Screens must not redirect on "no trip" before this.
   */
  ready: Promise<void> = Promise.resolve();

  /** Load the cached route and outbox, then refresh and sync whenever a connection is available. */
  start(): () => void {
    const onOnline = () => void this.sync();
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', this.emit);
    this.ready = (async () => {
      await this.loadCache().catch(() => undefined);
      const first = this.online() ? this.sync() : Promise.resolve();
      if (!this.trips.length) await first;
    })();
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', this.emit);
    };
  }

  getSnapshot = (): Snapshot => this.snapshot;

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  async submit(action: DriverAction): Promise<SyncState> {
    const trip = this.trips.find(t => t.id === action.tripId);
    if (!trip) throw new Error('This trip is no longer assigned to you. Refresh the route.');
    if (action.kind === 'departure') return this.depart(trip);
    const stop = 'sequence' in action && action.sequence !== undefined ? trip.stops.find(s => s.sequence === action.sequence) : undefined;
    if (action.kind !== 'issue' && !stop) throw new Error('This stop is no longer on your route. Refresh the route.');
    if (!isDeparted(trip)) throw new Error('Depart the trip before recording stop actions or issues.');
    const clientActionId = this.newId();
    const base = { clientActionId, expectedPlanVersion: trip.planVersion };
    let field: FieldAction;
    let attachments: Attachment[] = [];
    if (action.kind === 'arrival') {
      field = { kind: 'ARRIVE', stopId: stop!.id, request: { ...base, capturedAt: action.at } };
    } else if (action.kind === 'outcome') {
      const built = await this.outcome(stop!, action.delivery);
      attachments = built.attachments;
      field = { kind: 'OUTCOME', stopId: stop!.id, request: { ...base, capturedAt: action.at, delivery: built.delivery } };
    } else {
      attachments = action.photos.map(photo => ({ slot: 'photo' as const, blob: checkedImage(photo.file) }));
      field = {
        kind: 'ISSUE',
        request: {
          ...base, tripId: trip.id, stopId: stop?.id ?? null, capturedAt: new Date().toISOString(),
          type: ISSUE_TYPE[action.reason] ?? 'OTHER', note: [action.reason, action.notes.trim()].filter(Boolean).join(' — '), photoRefs: [],
        },
      };
    }
    // Durable first: the UI may only report acceptance after IndexedDB commits the action and its image bytes.
    await enqueue({
      id: clientActionId, queuedAt: new Date().toISOString(), actorId: this.deps.user.id, action: field,
      orderId: stop?.orderId ?? trip.stops[0]?.orderId ?? '', tripId: trip.id, attachments, status: 'PENDING_SYNC',
    });
    await this.reloadQueue();
    if (this.online()) void this.sync();
    return 'Saved on phone';
  }

  async retryAction(id: string) {
    const entry = this.queue.find(q => q.id === id);
    if (!entry) return;
    await enqueue({ ...entry, status: 'PENDING_SYNC', message: undefined });
    await this.reloadQueue();
    await this.sync();
  }

  /** The server keeps the conflicting facts for Dispatcher review, so the phone can drop its copy. */
  async acknowledgeConflict(id: string) {
    await removeAction(id);
    await this.reloadQueue();
    if (this.online()) await this.refresh();
  }

  /**
   * Push the outbox, then pull the server's view. Synced entries are removed only after that pull succeeds.
   * Concurrent callers share the in-flight run; work queued meanwhile triggers one more pass.
   */
  sync(): Promise<void> {
    if (this.inflight) {
      this.again = true;
      return this.inflight;
    }
    this.inflight = (async () => {
      do {
        this.again = false;
        await this.runSync();
      } while (this.again);
    })().finally(() => { this.inflight = null; });
    return this.inflight;
  }

  private async runSync() {
    this.syncing = true;
    this.emit();
    try {
      try {
        await flushQueue(this.deps.user.id, this.deps.token);
      } catch {
        // Network loss or 5xx: entries stay PENDING_SYNC with their message; retried on the next sync.
      }
      await this.reloadQueue();
      if (await this.refresh()) {
        for (const entry of this.queue.filter(q => q.status === 'SYNCED')) await removeAction(entry.id);
        await this.reloadQueue();
      }
    } finally {
      this.syncing = false;
      this.emit();
    }
  }

  /** Returns true when the server route was fetched. */
  async refresh(): Promise<boolean> {
    if (!this.online()) return false;
    try {
      const page = await this.api<{ items: TripView[] }>('/driver/trips?limit=100');
      const trips = [...page.items].sort((a, b) => a.date.localeCompare(b.date) || a.tripNo - b.tripNo);
      const missing = [...new Set(trips.flatMap(t => t.stops.map(s => s.orderId)))].filter(id => !this.orders[id]);
      const fetched = await Promise.all(missing.map(id => this.api<OrderView>(`/orders/${encodeURIComponent(id)}`).catch(() => null)));
      for (const order of fetched) if (order) this.orders[order.id] = order;
      this.profile = await this.api<DriverProfile>(`/users/driver/${encodeURIComponent(this.deps.user.id)}/profile`).catch(() => this.profile);
      this.trips = trips;
      this.lastSyncedAt = new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Colombo', hour: '2-digit', minute: '2-digit', hour12: false });
      await Promise.all([
        saveTrips(this.deps.user.id, trips),
        saveCached(`${this.deps.user.id}:orders`, this.orders),
        saveCached(`${this.deps.user.id}:profile`, this.profile),
        saveCached(`${this.deps.user.id}:lastSyncedAt`, this.lastSyncedAt),
      ]);
      this.emit();
      return true;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) this.deps.onUnauthorized?.();
      return false;
    }
  }

  private async depart(trip: TripView): Promise<SyncState> {
    if (!this.online()) throw new Error('Departure needs a connection so Dispatch and the Store see the trip leave. Try again when online.');
    await this.api(`/trips/${encodeURIComponent(trip.id)}/depart`, {
      method: 'POST', body: JSON.stringify({ clientActionId: this.newId(), expectedPlanVersion: trip.planVersion }),
    });
    await this.refresh();
    return 'Synced';
  }

  private async outcome(stop: TripView['stops'][number], draft: DeliveryDraft) {
    const lines = stop.lines.map(line => {
      const deliveredQty = draft.quantities[line.orderLineId] ?? 0;
      return { orderLineId: line.orderLineId, deliveredQty, returnedQty: (line.loadedQty ?? 0) - deliveredQty };
    });
    if (!lines.length || lines.some(l => l.returnedQty < 0)) throw new Error('Delivered quantities cannot exceed the loaded goods.');
    const nonEmpty = lines as [typeof lines[number], ...typeof lines];
    const attachments: Attachment[] = draft.photos.map(photo => ({ slot: 'photo' as const, blob: checkedImage(photo.file) }));
    const reason = draft.reason?.trim() ?? '';
    if (draft.outcome === 'failed') {
      if (!attachments.length) throw new Error('A failed delivery needs a photo of the attempt.');
      return { attachments, delivery: { outcome: 'FAILED', lines: nonEmpty, reason, photoRefs: ['pending'] } satisfies DeliveryOutcomePayload };
    }
    if (!draft.signature || !draft.recipient?.trim()) throw new Error('Recipient and signature are required.');
    attachments.unshift({ slot: 'signature', blob: await this.rasterize(draft.signature) });
    const proof = { recipientName: draft.recipient.trim(), signatureRef: 'pending', photoRefs: [] as string[] };
    if (draft.outcome === 'full')
      return { attachments, delivery: { outcome: 'DELIVERED', lines: nonEmpty, proof, damageReported: false } satisfies DeliveryOutcomePayload };
    const damageReported = /damage/i.test(reason);
    if (damageReported && !draft.photos.length) throw new Error('Damaged goods need a photo.');
    return { attachments, delivery: { outcome: 'PARTIAL', lines: nonEmpty, proof, reason, damageReported } satisfies DeliveryOutcomePayload };
  }

  private async loadCache() {
    const id = this.deps.user.id;
    const [trips, orders, profile, lastSyncedAt] = await Promise.all([
      cachedTrips(id),
      readCached<Record<string, OrderView>>(`${id}:orders`),
      readCached<DriverProfile | null>(`${id}:profile`),
      readCached<string>(`${id}:lastSyncedAt`),
    ]);
    if (!this.trips.length) this.trips = trips;
    this.orders = { ...(orders ?? {}), ...this.orders };
    this.profile ??= profile ?? null;
    if (lastSyncedAt && this.lastSyncedAt === 'Not yet synced') this.lastSyncedAt = lastSyncedAt;
    await this.reloadQueue();
  }

  private async reloadQueue() {
    this.queue = await pendingActions(this.deps.user.id);
    this.emit();
  }

  private api<T>(path: string, init: RequestInit = {}) {
    return apiFetch<T>(path, { ...init, token: this.deps.token });
  }

  private syncState(entry: QueueEntry): SyncState {
    if (entry.status === 'SYNCED') return 'Synced';
    if (entry.status === 'CONFLICT') return 'Conflict';
    if (entry.status === 'FAILED') return 'Failed';
    return this.syncing ? 'Syncing' : this.online() ? 'Pending' : 'Saved on phone';
  }

  private emit = () => {
    this.snapshot = this.build();
    for (const listener of this.listeners) listener();
  };

  private build(): Snapshot {
    const district = this.profile?.depot?.name ?? this.profile?.vehicle?.depot.name ?? 'Assigned depot';
    const trips = this.trips.map(trip => toDriverTrip(trip, this.orders, district));
    const departedTrips = Object.fromEntries(this.trips.filter(isDeparted).map(t => [t.id, true]));
    const stopRecords: Record<string, StopRecord> = {};
    for (const trip of this.trips)
      for (const stop of trip.stops) {
        const status = STOP_STATUS[stop.status];
        if (status) stopRecords[`${trip.id}-${stop.sequence}`] = { status, arrivedAt: stop.arrivedAt ? colomboTime(stop.arrivedAt) : undefined, syncState: 'Synced', photoCount: 0 };
      }
    const actions: PendingAction[] = [];
    for (const entry of this.queue) {
      const trip = this.trips.find(t => t.id === entry.tripId);
      const stopId = entry.action.kind === 'ISSUE' ? entry.action.request.stopId : entry.action.stopId;
      const sequence = trip?.stops.find(s => s.id === stopId)?.sequence;
      const syncState = this.syncState(entry);
      actions.push({ id: entry.id, tripId: entry.tripId, sequence, kind: KIND[entry.action.kind], state: syncState, message: entry.message });
      if (sequence === undefined || entry.action.kind === 'ISSUE') continue;
      const key = `${entry.tripId}-${sequence}`;
      const current = stopRecords[key];
      // Rejected work never shows as done: keep the server's status and only surface the sync state.
      if (entry.status === 'FAILED' || entry.status === 'CONFLICT') {
        if (current) current.syncState = syncState;
        continue;
      }
      if (entry.action.kind === 'ARRIVE' && (!current || current.status === 'Arrived'))
        stopRecords[key] = { status: 'Arrived', arrivedAt: colomboTime(entry.action.request.capturedAt), syncState, photoCount: 0 };
      if (entry.action.kind === 'OUTCOME') {
        const d = entry.action.request.delivery;
        const outcome = d.outcome === 'DELIVERED' ? 'full' : d.outcome === 'PARTIAL' ? 'partial' : 'failed';
        stopRecords[key] = {
          status: OUTCOME_STATUS[outcome], outcome, completedAt: colomboTime(entry.action.request.capturedAt), syncState,
          photoCount: entry.attachments.filter(a => a.slot === 'photo').length,
        };
      }
    }
    const vehicle = this.profile?.vehicle;
    const assignment: DriverIdentity = {
      name: this.deps.user.name, email: this.deps.user.email, avatar: '/58c66d11-4505-4e4e-88a9-0abccd947006.jpg',
      vehicle: vehicle?.id ?? 'No vehicle assigned', vehicleType: vehicle ? `${vehicle.type.toLowerCase()} · ${vehicle.temp.toLowerCase()}` : '',
      depot: district, date: '',
    };
    return { assignment, trips, stopRecords, departedTrips, actions, lastSyncedAt: this.lastSyncedAt };
  }
}

function checkedImage(file: File): Blob {
  if (!EVIDENCE_TYPES.includes(file.type)) throw new Error(`${file.name}: use a PNG, JPEG or WebP photo.`);
  if (file.size > MAX_EVIDENCE_BYTES) throw new Error(`${file.name}: photos must be under 10 MB.`);
  return file;
}
