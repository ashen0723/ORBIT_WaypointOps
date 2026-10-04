import React, { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from './SessionContext';
import { randomId } from '../utils/crypto';
import { idbDelete, idbGetAll, idbPut } from '../utils/idb';
import { fieldActionLabel, type FieldAction } from '../utils/fieldOps';
import { isForcedOffline, isOnline, NETWORK_EVENT, OfflineError, setForcedOffline, transport } from '../utils/network';

export type OpState = 'pending' | 'syncing' | 'synced' | 'failed' | 'conflict';

export interface QueuedOp {
  opId: string;
  userId: string;
  action: FieldAction;
  label: string;
  createdAt: string;
  state: OpState;
  attempts: number;
  error: string | null;
  syncedAt: string | null;
  replayed: boolean;
}

interface SyncValue {
  online: boolean;
  forcedOffline: boolean;
  setOffline: (value: boolean) => void;
  ops: QueuedOp[];
  pendingCount: number;
  problemCount: number;
  storageError: string | null;
  submit: (action: FieldAction) => Promise<QueuedOp>;
  retry: (opId: string) => Promise<void>;
  discard: (opId: string) => Promise<void>;
  flush: () => Promise<void>;
}

const SyncContext = createContext<SyncValue | null>(null);
export const SYNCED_EVENT = 'waypoint-synced';
const KEEP_SYNCED = 25;

/**
 * Durable outbox for loader and driver actions. Every action is written to IndexedDB first, then sent
 * with its stable opId. Network failures leave it pending; the server's idempotency table guarantees a
 * replay never applies twice; 409 responses become explicit conflicts the user must resolve.
 */
export function SyncProvider({ children }: {children: ReactNode;}) {
  const { user, token, expire } = useSession();
  const [ops, setOps] = useState<QueuedOp[]>([]);
  const [online, setOnline] = useState(isOnline());
  const [forcedOffline, setForced] = useState(isForcedOffline());
  const [storageError, setStorageError] = useState<string | null>(null);
  const flushing = useRef(false);
  const opsRef = useRef<QueuedOp[]>([]);
  opsRef.current = ops;

  const save = useCallback(async (op: QueuedOp) => {
    setOps((list) => {
      const next = list.some((o) => o.opId === op.opId) ? list.map((o) => o.opId === op.opId ? op : o) : [...list, op];
      return next.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    });
    try {
      await idbPut('ops', op);
    } catch (e) {
      setStorageError(e instanceof Error ? e.message : 'Offline storage unavailable.');
    }
  }, []);

  useEffect(() => {
    let alive = true;
    if (!user) {
      setOps([]);
      return;
    }
    idbGetAll<QueuedOp>('ops').
    then((all) => {
      if (!alive) return;
      // An op interrupted mid-send (tab closed) is retried; the server's idempotency makes that safe.
      const mine = all.filter((o) => o.userId === user.id).map((o) => o.state === 'syncing' ? { ...o, state: 'pending' as const } : o);
      setOps(mine.sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
    }).
    catch((e: unknown) => setStorageError(e instanceof Error ? e.message : 'Offline storage unavailable.'));
    return () => {
      alive = false;
    };
  }, [user]);

  const flush = useCallback(async () => {
    if (flushing.current || !token || !isOnline()) return;
    flushing.current = true;
    let synced = false;
    try {
      const queue = opsRef.current.filter((o) => o.state === 'pending');
      for (const op of queue) {
        const sending: QueuedOp = { ...op, state: 'syncing', attempts: op.attempts + 1 };
        await save(sending);
        try {
          const res = await transport({ op: 'field', opId: op.opId, action: op.action }, token);
          if (res.ok) {
            await save({ ...sending, state: 'synced', error: null, syncedAt: new Date().toISOString(), replayed: Boolean(res.replayed) });
            synced = true;
          } else if (res.status === 401) {
            await save({ ...sending, state: 'pending', error: res.message });
            expire();
            break;
          } else {
            await save({ ...sending, state: res.status === 409 ? 'conflict' : 'failed', error: res.message });
            synced = true;
          }
        } catch (e) {
          await save({ ...sending, state: 'pending', error: e instanceof OfflineError ? null : 'Couldn’t reach the server.' });
          break;
        }
      }
      const done = opsRef.current.filter((o) => o.state === 'synced').sort((a, b) => (b.syncedAt ?? '').localeCompare(a.syncedAt ?? ''));
      for (const old of done.slice(KEEP_SYNCED)) {
        await idbDelete('ops', old.opId).catch(() => undefined);
        setOps((list) => list.filter((o) => o.opId !== old.opId));
      }
    } finally {
      flushing.current = false;
      if (synced) window.dispatchEvent(new Event(SYNCED_EVENT));
    }
  }, [token, save, expire]);

  useEffect(() => {
    const update = () => {
      const now = isOnline();
      setOnline(now);
      setForced(isForcedOffline());
      if (now) void flush();
    };
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    window.addEventListener(NETWORK_EVENT, update);
    const timer = window.setInterval(() => {
      if (isOnline() && opsRef.current.some((o) => o.state === 'pending')) void flush();
    }, 12000);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
      window.removeEventListener(NETWORK_EVENT, update);
      window.clearInterval(timer);
    };
  }, [flush]);

  // Kick off a sync once the stored queue has loaded.
  useEffect(() => {
    if (ops.some((o) => o.state === 'pending') && isOnline()) void flush();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ops.length]);

  const submit = useCallback(
    async (action: FieldAction) => {
      if (!user) throw new Error('Not signed in');
      const op: QueuedOp = { opId: randomId(), userId: user.id, action, label: fieldActionLabel(action), createdAt: new Date().toISOString(), state: 'pending', attempts: 0, error: null, syncedAt: null, replayed: false };
      await save(op);
      opsRef.current = [...opsRef.current, op];
      void flush();
      return op;
    },
    [user, save, flush]
  );

  const retry = useCallback(
    async (opId: string) => {
      const op = opsRef.current.find((o) => o.opId === opId);
      if (!op) return;
      const next = { ...op, state: 'pending' as const, error: null };
      await save(next);
      opsRef.current = opsRef.current.map((o) => o.opId === opId ? next : o);
      void flush();
    },
    [save, flush]
  );

  const discard = useCallback(async (opId: string) => {
    setOps((list) => list.filter((o) => o.opId !== opId));
    await idbDelete('ops', opId).catch(() => undefined);
  }, []);

  const value = useMemo<SyncValue>(
    () => ({
      online,
      forcedOffline,
      setOffline: setForcedOffline,
      ops,
      pendingCount: ops.filter((o) => o.state === 'pending' || o.state === 'syncing').length,
      problemCount: ops.filter((o) => o.state === 'failed' || o.state === 'conflict').length,
      storageError,
      submit,
      retry,
      discard,
      flush
    }),
    [online, forcedOffline, ops, storageError, submit, retry, discard, flush]
  );

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSync(): SyncValue {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error('useSync must be used inside SyncProvider');
  return ctx;
}