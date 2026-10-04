import type { DB } from '../types/dispatch';
import { createSeedDb, SCHEMA } from './seed';

/**
 * Storage adapter for the server. The browser build persists to localStorage (shared by every tab on
 * this origin, so separate sessions see each other's changes); tests use an isolated in-memory store.
 * Each request reads a fresh copy and writes only on success, so a failed request never half-applies.
 */
export interface DbStore {
  read(): DB;
  write(db: DB): void;
}

const KEY = 'waypoint.server.db';
const listeners = new Set<() => void>();

function seedFresh(): DB {
  const db = createSeedDb(new Date());
  localStorage.setItem(KEY, JSON.stringify(db));
  return db;
}

export const browserStore: DbStore = {
  read() {
    const raw = localStorage.getItem(KEY);
    if (!raw) return seedFresh();
    try {
      const db = JSON.parse(raw) as DB;
      return db.schema === SCHEMA ? db : seedFresh();
    } catch {
      return seedFresh();
    }
  },
  write(db) {
    localStorage.setItem(KEY, JSON.stringify(db));
    listeners.forEach((l) => l());
  }
};

export function memoryStore(initial: DB): DbStore {
  let json = JSON.stringify(initial);
  return {
    read: () => JSON.parse(json) as DB,
    write: (db) => {
      json = JSON.stringify(db);
    }
  };
}

/** Fires on writes from this tab and from any other tab. */
export function subscribeDb(cb: () => void): () => void {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) cb();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener('storage', onStorage);
  };
}

export function resetBrowserDb(): void {
  localStorage.removeItem(KEY);
  seedFresh();
  listeners.forEach((l) => l());
}