export type DeliveryStatus =
'Planned' |
'Loaded' |
'Out for delivery' |
'Arrived' |
'Delivered' |
'Partially delivered' |
'Failed' |
'Changed by dispatcher';

export type SyncState = 'Synced' | 'Saved on phone' | 'Needs attention' | 'Pending' | 'Syncing' | 'Failed' | 'Conflict' | 'Demo only';
export type ConnectionState = 'online' | 'offline' | 'syncing';
export type DeliveryOutcome = 'full' | 'partial' | 'failed';
export type AccessType = 'normal' | 'van_only' | 'mall_dock';
export type UnloadingMethod = 'rear dock' | 'street' | 'mall loading bay';

export interface DriverItem {
  id: string;
  name: string;
  planned: number;
  loaded?: number;
  chilled: boolean;
}

export interface DriverStop {
  id?: string;
  orderId?: string;
  sequence: number;
  outletId: string;
  name: string;
  address: string;
  window: string;
  eta?: string;
  unloading: UnloadingMethod;
  access: AccessType;
  cases: number;
  chilledCases: number;
  contactName: string;
  contactPhone: string;
  accessNote: string;
  items: DriverItem[];
}

export interface DriverTrip {
  id: string;
  number: number;
  brand: 'Waypoint Fresh' | 'Waypoint Style';
  district: string;
  departure: string;
  status: DeliveryStatus;
  stops: DriverStop[];
  loaderFlag?: string;
}