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
export type Unit = string;

export interface OrderItem {
  id: string;
  name: string;
  qty: number;
  unit: Unit;
  /** Quantity handed over on the delivery attempt being receipted. */
  deliveredQty?: number;
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
  photoRef?: string | null;
  signatureRef?: string | null;
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
  deliveredDate?: string;
  items: OrderItem[];
  deferral?: Deferral;
  vehicle?: VehicleInfo;
  pod?: ProofOfDelivery;
  events?: Partial<Record<TimelineStep, string>>;
  deliveryError?: string;
  deliveryId?: string;
  deliveryVersion?: number;
  receiptConfirmed?: boolean;
  recoveryPending?: boolean;
}

export interface CatalogItem {
  id?: string;
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
