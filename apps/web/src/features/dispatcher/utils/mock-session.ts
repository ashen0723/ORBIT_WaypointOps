import type { AuthUser } from '../../../api/auth';
import type { PublicUser } from '../types/dispatch';
import { browserStore } from '../server/db';
import { randomId } from './crypto';

/** Temporary local business adapter, never backend authentication. No password is copied.
 * Matching demo emails supply the mock driver's identity; backend assignments remain authoritative.
 * This can be removed when business endpoints move off the in-browser server.
 */
export function createMockSession(user: AuthUser): { mockToken: string; user: PublicUser & { vehicleId?: string } } {
  const db = browserStore.read();
  const demo = db.users.find(candidate => candidate.email === user.email && candidate.role === user.role);
  const driverId = user.role === 'driver'
    ? (user.vehicleId ? db.vehicles.find(vehicle => vehicle.id === user.vehicleId)?.defaultDriverId : demo?.driverId)
    : undefined;
  const profile: PublicUser & { vehicleId?: string } = {
    id: user.id, email: user.email, name: user.name, role: user.role,
    ...(user.outletId ? { outletId: user.outletId } : {}),
    ...(user.depotId ? { depotId: user.depotId as PublicUser['depotId'] } : {}),
    ...(driverId ? { driverId } : {}),
    ...(user.vehicleId ? { vehicleId: user.vehicleId } : {}),
  };
  db.users = [...db.users.filter(candidate => candidate.id !== user.id), { ...profile, passwordHash: '' }];
  const mockToken = randomId();
  db.sessions.push({ token: mockToken, userId: user.id, createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 12 * 3600000).toISOString() });
  browserStore.write(db);
  return { mockToken, user: profile };
}

export function removeMockSession(token: string | null): void {
  if (!token) return;
  const db = browserStore.read();
  db.sessions = db.sessions.filter(session => session.token !== token);
  browserStore.write(db);
}
