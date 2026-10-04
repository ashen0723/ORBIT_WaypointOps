import React, { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { Depot, DepotId, Draft, Driver, Order, Outlet, PublicUser, Snapshot, Trip, Vehicle } from '../types/dispatch';
import type { ApiResponse, MutationRequest } from '../server/api';
import { subscribeDb } from '../server/db';
import { useSession } from './SessionContext';
import { SYNCED_EVENT, useSync } from './SyncContext';
import { randomId } from '../utils/crypto';
import { idbGet, idbPut } from '../utils/idb';
import { applyFieldAction } from '../utils/fieldOps';
import { NETWORK_EVENT, OfflineError, transport } from '../utils/network';
import { earliestDeliveryDate } from '../utils/calendar';
import { findIncompatible, type PlanContext } from '../utils/tripValidation';

type LoadStatus = 'loading' | 'ready' | 'error';

interface DispatchValue extends Omit<Snapshot, 'user'> {
  user: PublicUser;
  status: LoadStatus;
  error: string | null;
  /** True when showing the offline cache rather than live server data. */
  stale: boolean;
  lastLoadedAt: string | null;
  planContext: PlanContext;
  getOrder: (id: string) => Order | undefined;
  getOutlet: (id: string) => Outlet | undefined;
  getVehicle: (id: string) => Vehicle | undefined;
  getDriver: (id: string) => Driver | undefined;
  getDepot: (id: DepotId) => Depot | undefined;
  getTrip: (id: string) => Trip | undefined;
  tripForOrder: (orderId: string) => Trip | undefined;
  refresh: () => Promise<void>;
  /** Online-only mutation. Returns the server response; shows an actionable toast on failure. */
  run: <T = unknown>(req: MutationRequest, opts?: {quiet?: boolean;}) => Promise<ApiResponse<T>>;
  draft: Draft;
  updateDraft: (patch: Partial<Draft>) => void;
  addToDraft: (orderIds: string[]) => string[];
  removeFromDraft: (orderId: string) => void;
  startTripWith: (orderId: string) => string[];
  resetDraft: (keep?: Partial<Draft>) => void;
}

const DispatchContext = createContext<DispatchValue | null>(null);

const EMPTY: Omit<Snapshot, 'user'> = { serverTime: new Date().toISOString(), depots: [], outlets: [], vehicles: [], drivers: [], calendar: [], orders: [], trips: [], deferrals: [], events: [] };

export function DispatchProvider({ children }: {children: ReactNode;}) {
  const { user, token, expire } = useSession();
  const { ops } = useSync();
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  const [lastLoadedAt, setLastLoadedAt] = useState<string | null>(null);
  const cacheKey = user ? `snapshot:${user.id}` : '';
  const inflight = useRef(false);
  const again = useRef(false);

  const refresh = useCallback(async () => {
    if (!token || !user) return;
    if (inflight.current) {
      again.current = true;
      return;
    }
    inflight.current = true;
    try {
      const res = await transport<Snapshot>({ op: 'snapshot' }, token);
      if (!res.ok) {
        if (res.status === 401) {
          expire();
          return;
        }
        setError(res.message);
        setStatus((s) => s === 'loading' ? 'error' : s);
        return;
      }
      setSnap(res.data);
      setStale(false);
      setError(null);
      setStatus('ready');
      setLastLoadedAt(new Date().toISOString());
      idbPut('cache', { key: cacheKey, snapshot: res.data, savedAt: new Date().toISOString() }).catch(() => undefined);
    } catch (e) {
      if (e instanceof OfflineError) {
        const cached = await idbGet<{key: string;snapshot: Snapshot;savedAt: string;}>('cache', cacheKey).catch(() => undefined);
        if (cached) {
          setSnap((cur) => cur ?? cached.snapshot);
          setLastLoadedAt((cur) => cur ?? cached.savedAt);
          setStatus('ready');
        } else {
          setStatus((s) => s === 'loading' ? 'error' : s);
          setError('You’re offline and this device has no saved copy of your work yet. Reconnect once to download it.');
        }
        setStale(true);
      } else {
        setError('Couldn’t load data.');
        setStatus((s) => s === 'loading' ? 'error' : s);
      }
    } finally {
      inflight.current = false;
      if (again.current) {
        again.current = false;
        void refresh();
      }
    }
  }, [token, user, cacheKey, expire]);

  useEffect(() => {
    void refresh();
    const unsub = subscribeDb(() => void refresh());
    const onEvt = () => void refresh();
    window.addEventListener(SYNCED_EVENT, onEvt);
    window.addEventListener(NETWORK_EVENT, onEvt);
    window.addEventListener('online', onEvt);
    const timer = window.setInterval(() => void refresh(), 20000);
    return () => {
      unsub();
      window.removeEventListener(SYNCED_EVENT, onEvt);
      window.removeEventListener(NETWORK_EVENT, onEvt);
      window.removeEventListener('online', onEvt);
      window.clearInterval(timer);
    };
  }, [refresh]);

  // Overlay not-yet-synced field actions so offline work is visible immediately.
  const trips = useMemo(() => {
    const base = snap?.trips ?? [];
    const pending = ops.filter((o) => o.state === 'pending' || o.state === 'syncing');
    if (!pending.length) return base;
    return base.map((t) => pending.filter((o) => o.action.tripId === t.id).reduce((acc, o) => applyFieldAction(acc, o.action, user?.name ?? '', o.createdAt), t));
  }, [snap, ops, user]);

  const data = snap ?? { ...EMPTY, user: user as PublicUser };

  // ── Dispatcher draft (persisted per user so a refresh keeps an in-progress plan) ──
  const draftKey = user ? `waypoint.draft.${user.id}` : '';
  const [draft, setDraft] = useState<Draft>(() => {
    try {
      const raw = draftKey ? localStorage.getItem(draftKey) : null;
      if (raw) return JSON.parse(raw) as Draft;
    } catch {

      /* ignore */}
    return { date: '', depotId: 'DEP-PLG', orderIds: [], vehicleId: null, driverId: null, departAt: null };
  });
  useEffect(() => {
    if (draftKey) localStorage.setItem(draftKey, JSON.stringify(draft));
  }, [draft, draftKey]);

  // Default the planning date once data arrives, and drop orders that are no longer free.
  useEffect(() => {
    if (!snap || user?.role !== 'dispatcher') return;
    setDraft((d) => {
      const date = d.date || earliestDeliveryDate(snap.calendar, d.depotId, snap.serverTime);
      const orderIds = d.orderIds.filter((id) => snap.orders.some((o) => o.id === id && o.status === 'pending' && o.plannedDate === date && o.depotId === d.depotId));
      return date === d.date && orderIds.length === d.orderIds.length ? d : { ...d, date, orderIds };
    });
  }, [snap, user]);

  const getOrder = useCallback((id: string) => data.orders.find((o) => o.id === id), [data.orders]);

  const run = useCallback(
    async <T,>(req: MutationRequest, opts?: {quiet?: boolean;}): Promise<ApiResponse<T>> => {
      try {
        const res = await transport<T>({ ...req, opId: randomId() }, token);
        if (!res.ok) {
          if (res.status === 401) expire();
          if (!opts?.quiet) toast.error(res.message, { description: res.details.length > 1 ? `${res.details.length} problems — see the checks panel.` : undefined });
        }
        void refresh();
        return res;
      } catch (e) {
        const message = e instanceof OfflineError ? 'You’re offline. This action needs a connection.' : 'Couldn’t reach the server.';
        if (!opts?.quiet) toast.error(message);
        return { ok: false, status: 0, code: 'OFFLINE', message, details: [] };
      }
    },
    [token, expire, refresh]
  );

  const addToDraft = useCallback(
    (ids: string[]) => {
      const current = draft.orderIds.map(getOrder).filter((o): o is Order => Boolean(o));
      const adding = ids.filter((id) => !draft.orderIds.includes(id)).map(getOrder).filter((o): o is Order => Boolean(o));
      const blocked = findIncompatible(current, adding).map((o) => o.id);
      setDraft((d) => ({ ...d, orderIds: [...d.orderIds, ...adding.filter((o) => !blocked.includes(o.id)).map((o) => o.id)] }));
      return blocked;
    },
    [draft.orderIds, getOrder]
  );

  const value: DispatchValue = {
    ...data,
    trips,
    user: data.user,
    status,
    error,
    stale,
    lastLoadedAt,
    planContext: { orders: data.orders, trips, vehicles: data.vehicles, drivers: data.drivers, outlets: data.outlets, depots: data.depots, calendar: data.calendar },
    getOrder,
    getOutlet: (id) => data.outlets.find((o) => o.id === id),
    getVehicle: (id) => data.vehicles.find((v) => v.id === id),
    getDriver: (id) => data.drivers.find((d) => d.id === id),
    getDepot: (id) => data.depots.find((d) => d.id === id),
    getTrip: (id) => trips.find((t) => t.id === id),
    tripForOrder: (orderId) => {
      const o = getOrder(orderId);
      return o?.currentTripId ? trips.find((t) => t.id === o.currentTripId) : undefined;
    },
    refresh,
    run,
    draft,
    updateDraft: (patch) => setDraft((d) => ({ ...d, ...patch })),
    addToDraft,
    removeFromDraft: (id) => setDraft((d) => ({ ...d, orderIds: d.orderIds.filter((x) => x !== id) })),
    startTripWith: (orderId) => {
      const o = getOrder(orderId);
      if (!o) return [];
      if (draft.date === o.plannedDate && draft.depotId === o.depotId) return draft.orderIds.includes(orderId) ? [] : addToDraft([orderId]);
      setDraft({ date: o.plannedDate, depotId: o.depotId, orderIds: [orderId], vehicleId: null, driverId: null, departAt: null });
      return [];
    },
    resetDraft: (keep) => setDraft((d) => ({ date: d.date, depotId: d.depotId, orderIds: [], vehicleId: null, driverId: null, departAt: null, ...keep }))
  };

  return <DispatchContext.Provider value={value}>{children}</DispatchContext.Provider>;
}

export function useDispatch(): DispatchValue {
  const ctx = useContext(DispatchContext);
  if (!ctx) throw new Error('useDispatch must be used inside DispatchProvider');
  return ctx;
}