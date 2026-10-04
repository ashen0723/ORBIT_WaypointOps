import { browserStore } from '../server/db';
import { serverCall, type ApiRequest, type ApiResponse } from '../server/api';

/**
 * Network boundary between the client and the server module. The server runs in-process, so the
 * transport refuses requests whenever the browser is offline OR this tab is in simulated-offline
 * mode — exactly what a real fetch would do — which lets offline behaviour be demonstrated and tested.
 */
const FORCE_KEY = 'waypoint.forceOffline';
export const NETWORK_EVENT = 'waypoint-network';

export class OfflineError extends Error {
  constructor() {
    super('You’re offline.');
    this.name = 'OfflineError';
  }
}

export function isForcedOffline(): boolean {
  return sessionStorage.getItem(FORCE_KEY) === '1';
}

export function setForcedOffline(value: boolean): void {
  if (value) sessionStorage.setItem(FORCE_KEY, '1');else
  sessionStorage.removeItem(FORCE_KEY);
  window.dispatchEvent(new Event(NETWORK_EVENT));
}

export function isOnline(): boolean {
  return navigator.onLine && !isForcedOffline();
}

const LATENCY_MS = 160;

export async function transport<T = unknown>(req: ApiRequest, token: string | null): Promise<ApiResponse<T>> {
  if (!isOnline()) throw new OfflineError();
  await new Promise((r) => setTimeout(r, LATENCY_MS));
  if (!isOnline()) throw new OfflineError();
  return serverCall(req, token, { store: browserStore }) as ApiResponse<T>;
}