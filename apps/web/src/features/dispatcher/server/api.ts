import type { DeferralReason, NewOrderInput, PublicUser, Snapshot, User } from '../types/dispatch';
import { SESSION_HOURS } from '../data/rules';
import { hashPassword, randomId } from '../utils/crypto';
import type { FieldAction } from '../utils/fieldOps';
import type { TripProposal } from '../utils/tripValidation';
import type { DbStore } from './db';
import { createSeedDb } from './seed';
import { buildSnapshot } from './scope';
import { ApiError, publicUser, requireRole } from './support';
import { confirmReceipt, createOrder, deferOrder, rescheduleOrder } from './handlers/orders';
import { confirmTrip, notifyStore, setVehicleAvailability } from './handlers/trips';
import { handleField } from './handlers/field';

export type MutationRequest =
{op: 'createOrder';input: NewOrderInput;} |
{op: 'confirmReceipt';orderId: string;receivedUnits: number;damagedUnits: number;note: string;} |
{op: 'confirmTrip';proposal: TripProposal;} |
{op: 'deferOrder';orderId: string;reason: DeferralReason;note: string;toDate: string;} |
{op: 'rescheduleOrder';orderId: string;newDate: string;note: string;} |
{op: 'notifyStore';tripId: string;orderId: string;message: string;} |
{op: 'setVehicleAvailability';vehicleId: string;date: string;available: boolean;reason: string;} |
{op: 'field';action: FieldAction;} |
{op: 'resetDemo';};

export type ApiRequest = {op: 'login';email: string;password: string;} | {op: 'logout';} | {op: 'snapshot';} | (MutationRequest & {opId: string;});

export type ApiResponse<T = unknown> = {ok: true;data: T;replayed?: boolean;} | {ok: false;status: number;code: string;message: string;details: string[];};

export interface ServerEnv {
  store: DbStore;
  now?: Date;
}

const MAX_OPS = 3000;

/**
 * The backend entry point. Every request authenticates, authorizes, validates and applies inside a
 * single read-modify-write; the store is only written when the whole request succeeds.
 * Mutations carry a client-generated opId — replays return the original response without re-applying.
 */
export function serverCall(req: ApiRequest, token: string | null, env: ServerEnv): ApiResponse {
  const now = (env.now ?? new Date()).toISOString();
  const db = env.store.read();
  try {
    if (req.op === 'login') {
      const email = req.email.trim().toLowerCase();
      const user = db.users.find((u) => u.email === email);
      if (!user || user.passwordHash !== hashPassword(email, req.password)) throw new ApiError(401, 'BAD_CREDENTIALS', 'Email or password is incorrect.');
      const session = { token: randomId(), userId: user.id, createdAt: now, expiresAt: new Date(Date.parse(now) + SESSION_HOURS * 3600000).toISOString() };
      db.sessions = [...db.sessions.filter((s) => s.expiresAt > now), session];
      env.store.write(db);
      const data: {token: string;user: PublicUser;} = { token: session.token, user: publicUser(user) };
      return { ok: true, data };
    }

    const user = authenticate(db, token, now);

    if (req.op === 'logout') {
      db.sessions = db.sessions.filter((s) => s.token !== token);
      env.store.write(db);
      return { ok: true, data: null };
    }
    if (req.op === 'snapshot') {
      const snapshot: Snapshot = buildSnapshot(db, user, now);
      return { ok: true, data: snapshot };
    }

    if (!req.opId || typeof req.opId !== 'string') throw new ApiError(422, 'OP_ID_REQUIRED', 'Missing operation id.');
    const prior = db.processedOps[req.opId];
    if (prior) {
      if (prior.userId !== user.id) throw new ApiError(409, 'OP_ID_CONFLICT', 'Operation id belongs to another user.');
      return { ...(prior.response as ApiResponse), replayed: true } as ApiResponse;
    }

    if (req.op === 'resetDemo') {
      requireRole(user, 'dispatcher');
      const fresh = createSeedDb(new Date(now));
      fresh.sessions = db.sessions;
      env.store.write(fresh);
      return { ok: true, data: null };
    }

    let data: unknown;
    switch (req.op) {
      case 'createOrder':
        data = createOrder(db, user, req.input, now);
        break;
      case 'confirmReceipt':
        data = confirmReceipt(db, user, req, now);
        break;
      case 'confirmTrip':
        data = confirmTrip(db, user, req.proposal, now);
        break;
      case 'deferOrder':
        data = deferOrder(db, user, req, now);
        break;
      case 'rescheduleOrder':
        data = rescheduleOrder(db, user, req, now);
        break;
      case 'notifyStore':
        data = notifyStore(db, user, req, now);
        break;
      case 'setVehicleAvailability':
        data = setVehicleAvailability(db, user, req, now);
        break;
      case 'field':
        data = handleField(db, user, req.action, now);
        break;
      default:
        throw new ApiError(400, 'UNKNOWN_OP', 'Unknown request.');
    }
    const response: ApiResponse = { ok: true, data };
    remember(db, req.opId, user.id, now, response);
    env.store.write(db);
    return response;
  } catch (e) {
    if (!(e instanceof ApiError)) {
      return { ok: false, status: 500, code: 'SERVER_ERROR', message: e instanceof Error ? e.message : 'Unexpected server error.', details: [] };
    }
    const response: ApiResponse = { ok: false, status: e.status, code: e.code, message: e.message, details: e.details };
    // Conflicts are remembered too, so a retried offline action keeps returning the same answer.
    if (e.status === 409 && 'opId' in req && req.opId && e.code !== 'OP_ID_CONFLICT') {
      const fresh = env.store.read();
      const userId = fresh.sessions.find((s) => s.token === token)?.userId;
      if (userId) {
        remember(fresh, req.opId, userId, now, response);
        env.store.write(fresh);
      }
    }
    return response;
  }
}

function authenticate(db: {sessions: {token: string;userId: string;expiresAt: string;}[];users: User[];}, token: string | null, now: string): User {
  if (!token) throw new ApiError(401, 'UNAUTHENTICATED', 'Sign in to continue.');
  const session = db.sessions.find((s) => s.token === token);
  if (!session || session.expiresAt <= now) throw new ApiError(401, 'SESSION_EXPIRED', 'Your session has expired. Sign in again.');
  const user = db.users.find((u) => u.id === session.userId);
  if (!user) throw new ApiError(401, 'UNAUTHENTICATED', 'Account no longer exists.');
  return user;
}

function remember(db: {processedOps: Record<string, {userId: string;at: string;response: unknown;}>;}, opId: string, userId: string, at: string, response: ApiResponse): void {
  db.processedOps[opId] = { userId, at, response };
  const keys = Object.keys(db.processedOps);
  if (keys.length > MAX_OPS) {
    keys.
    sort((a, b) => db.processedOps[a].at.localeCompare(db.processedOps[b].at)).
    slice(0, keys.length - MAX_OPS).
    forEach((k) => delete db.processedOps[k]);
  }
}