export type Brand = 'Fresh' | 'Style' | 'Tech';
export type OrderType = 'dry' | 'chilled';
export type OrderStatus =
'placed' |
'confirmed' |
'planned' |
'loading' |
'in_transit' |
'delivered' |
'receipt_confirmed' |
'deferred';
export type TimelineStep = Exclude<OrderStatus, 'deferred'>;
export type Unit = 'cases' | 'units' | 'crates';

export interface OrderItem {
  id: string;
  name: string;
  qty: number;
  unit: Unit;
}

export interface Deferral {
  originalDate: string;
  newDate: string;
  reason: string;
  detail: string;
  decidedAt: string;
}

export interface VehicleInfo {
  driver: string;
  plate: string;
  vehicleType: string;
  progress: number;
  stopsBefore: number;
}

export interface ProofOfDelivery {
  receivedBy: string;
  location: string;
}

export interface Order {
  id: string;
  brand: Brand;
  type: OrderType;
  status: OrderStatus;
  requestedDate: string;
  submittedAt: string;
  eta?: string;
  deliveredAt?: string;
  items: OrderItem[];
  deferral?: Deferral;
  vehicle?: VehicleInfo;
  pod?: ProofOfDelivery;
  events?: Partial<Record<TimelineStep, string>>;
}

export interface CatalogItem {
  name: string;
  brand: Brand;
  type: OrderType;
  unit: Unit;
  kg: number;
  m3: number;
}

export interface LineDraft {
  id: string;
  name: string;
  qty: string;
  unit: Unit;
}

export type NewOrderInput = Pick<Order, 'brand' | 'type' | 'requestedDate' | 'items' | 'submittedAt'>;