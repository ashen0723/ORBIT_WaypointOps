/* Waypoint domain model. Shared by the in-browser server and the client UI. */

export type DepotId = 'DEP-PLG' | 'DEP-KDY';
export type Brand = 'Fresh' | 'Style' | 'Tech';
/** Storage requirement — independent from brand. */
export type Temperature = 'ambient' | 'chilled' | 'frozen';
export type Role = 'dispatcher' | 'loader' | 'driver' | 'store_manager';
export type DockType = 'loading_dock' | 'kerbside' | 'rear_lane';

export interface Depot {
  id: DepotId;
  name: string;
  lat: number;
  lng: number;
  /** 24h "HH:MM" — loading can start from this time. */
  opensAt: string;
  closesAt: string;
}

export interface Outlet {
  id: string;
  name: string;
  area: string;
  address: string;
  lat: number;
  lng: number;
  depotId: DepotId;
  vanOnly: boolean;
  dock: DockType;
  dockNote: string;
  windowStart: string;
  windowEnd: string;
  instructions: string;
  phone: string;
}

export type VehicleType = 'Refrigerated Truck' | 'Freezer Truck' | 'Ambient Truck' | 'Chilled Van' | 'Van';

export interface VehicleUnavailability {
  date: string;
  reason: string;
}

export interface Vehicle {
  id: string;
  type: VehicleType;
  depotId: DepotId;
  capacityKg: number;
  capacityM3: number;
  /** The storage temperature the body holds. */
  refrigeration: Temperature;
  isVan: boolean;
  defaultDriverId: string | null;
  fuelLPer100Km: number;
  weeklyFuelBudgetL: number;
  /** Maximum cumulative operating minutes per day (loading + driving + stops). */
  maxDailyMin: number;
  unavailable: VehicleUnavailability[];
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  depotId: DepotId;
}

export interface CalendarDay {
  date: string;
  depotId: DepotId | 'ALL';
  operating: boolean;
  note: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  passwordHash: string;
  outletId?: string;
  depotId?: DepotId;
  driverId?: string;
}

export type PublicUser = Omit<User, 'passwordHash'>;

export type OrderStatus = 'pending' | 'allocated' | 'in_transit' | 'delivered' | 'partially_delivered';

export interface Receipt {
  receivedUnits: number;
  damagedUnits: number;
  missingUnits: number;
  note: string;
  confirmedAt: string;
  confirmedBy: string;
}

export interface Order {
  id: string;
  outletId: string;
  depotId: DepotId;
  brand: Brand;
  temperature: Temperature;
  /** Date the store asked for. Never changes. */
  requestedDate: string;
  /** Date the order is currently planned for (moves with deferrals). */
  plannedDate: string;
  /** ISO timestamp. */
  createdAt: string;
  createdBy: string;
  units: number;
  weightKg: number;
  volumeM3: number;
  windowStart: string;
  windowEnd: string;
  status: OrderStatus;
  /** The trip currently carrying this order. Historical trips live in `attempts`. */
  currentTripId: string | null;
  attempts: string[];
  deferralCount: number;
  note: string;
  deliveredUnits: number | null;
  receipt: Receipt | null;
}

export type TripStatus = 'loading' | 'on_road' | 'completed';
export type StopStatus = 'pending' | 'arrived' | 'delivered' | 'failed' | 'deferred';

export interface Delay {
  minutes: number;
  reason: string;
  reportedAt: string;
  reportedBy: string;
  /** Set only when the vehicle physically reaches the stop. */
  resolvedAt: string | null;
}

export interface ProofOfDelivery {
  recipientName: string;
  /** PNG data URL of the recipient's signature. */
  signature: string;
  note: string;
  capturedAt: string;
}

export interface Stop {
  orderId: string;
  outletId: string;
  seq: number;
  plannedArrival: string;
  plannedDepart: string;
  waitMin: number;
  handlingMin: number;
  revisedArrival: string | null;
  status: StopStatus;
  arrivedAt: string | null;
  completedAt: string | null;
  deliveredUnits: number | null;
  damagedUnits: number;
  note: string;
  failedReason: string;
  pod: ProofOfDelivery | null;
  delay: Delay | null;
  /** Notification acknowledgement — separate from the physical delay. */
  storeNotifiedAt: string | null;
}

export interface LoadLine {
  orderId: string;
  expectedUnits: number;
  /** null = not yet recorded. 0 = entirely missing. */
  loadedUnits: number | null;
  damagedUnits: number;
  reason: string;
  recordedBy: string | null;
  recordedAt: string | null;
}

export interface Trip {
  id: string;
  number: number;
  date: string;
  depotId: DepotId;
  vehicleId: string;
  driverId: string;
  departAt: string;
  returnAt: string;
  distanceKm: number;
  fuelL: number;
  durationMin: number;
  status: TripStatus;
  load: LoadLine[];
  stops: Stop[];
  exceptionAck: {by: string;at: string;note: string;} | null;
  departedAt: string | null;
  completedAt: string | null;
  createdBy: string;
  createdAt: string;
}

export type DeferralReason = 'no_vehicle' | 'capacity' | 'window' | 'vehicle_requirement' | 'store_closed' | 'not_loaded' | 'delivery_failed' | 'manual' | 'other';

export interface DeferralEvent {
  id: string;
  kind: 'deferred' | 'rescheduled';
  orderId: string;
  outletId: string;
  reason: DeferralReason;
  note: string;
  fromDate: string;
  toDate: string;
  tripId: string | null;
  actorId: string;
  actorName: string;
  at: string;
}

export type EventType =
'order_created' |
'trip_confirmed' |
'order_allocated' |
'load_recorded' |
'loading_exception' |
'exceptions_acknowledged' |
'trip_departed' |
'stop_arrived' |
'stop_delivered' |
'stop_failed' |
'delay_reported' |
'store_notified' |
'order_deferred' |
'order_rescheduled' |
'receipt_confirmed' |
'trip_completed' |
'vehicle_availability';

export interface OpsEvent {
  id: string;
  type: EventType;
  at: string;
  actorId: string;
  actorName: string;
  message: string;
  orderId?: string;
  tripId?: string;
  outletId?: string;
  depotId?: DepotId;
}

export interface Session {
  token: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
}

export interface ProcessedOp {
  userId: string;
  at: string;
  response: unknown;
}

export interface DB {
  schema: number;
  seededAt: string;
  depots: Depot[];
  outlets: Outlet[];
  vehicles: Vehicle[];
  drivers: Driver[];
  calendar: CalendarDay[];
  users: User[];
  orders: Order[];
  trips: Trip[];
  deferrals: DeferralEvent[];
  events: OpsEvent[];
  sessions: Session[];
  processedOps: Record<string, ProcessedOp>;
  counters: {order: number;trip: number;event: number;};
}

/** What a signed-in user is allowed to read. Built server-side per role. */
export interface Snapshot {
  user: PublicUser;
  serverTime: string;
  depots: Depot[];
  outlets: Outlet[];
  vehicles: Vehicle[];
  drivers: Driver[];
  calendar: CalendarDay[];
  orders: Order[];
  trips: Trip[];
  deferrals: DeferralEvent[];
  events: OpsEvent[];
}

export interface Draft {
  date: string;
  depotId: DepotId;
  orderIds: string[];
  vehicleId: string | null;
  driverId: string | null;
  /** Manual departure override "HH:MM"; null = earliest feasible. */
  departAt: string | null;
}

export interface NewOrderInput {
  brand: Brand;
  temperature: Temperature;
  requestedDate: string;
  units: number;
  weightKg: number;
  volumeM3: number;
  windowStart?: string;
  windowEnd?: string;
  note?: string;
}