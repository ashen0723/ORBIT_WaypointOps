export type LoaderQueueStatus = 'ready' | 'in_progress' | 'waiting' | 'plan_updated' | 'completed';
export type LoaderIssueType = 'missing' | 'damaged';

export interface LoadItem {
  id: string;
  name: string;
  expected: number;
  loaded: number;
  unit: string;
  condition: 'ambient' | 'chilled';
  maxAvailable?: number;
}

export interface LoadOrder {
  id: string;
  outletId: string;
  outletName: string;
  location: string;
  stop: number;
  weightKg?: number;
  volumeM3?: number;
  items: LoadItem[];
}

export interface LoadStop {
  number: number;
  outletId: string;
  outletName: string;
  location: string;
  orderIds: string[];
  conditions: string;
}

export interface LoadQueueItem {
  vehicleId: string;
  trip: string;
  brand: string;
  departure: string;
  stops: number;
  status: LoaderQueueStatus;
  priority: 'High' | 'Standard';
  priorityReason?: string;
  vehicleType: 'Truck' | 'Van';
  temperature: 'Reefer' | 'Ambient';
  district: string;
  orderCount: number;
  loadedWeightKg: number;
  weightCapacityKg: number;
  loadedVolumeM3: number;
  volumeCapacityM3: number;
  updateMessage?: string;
}

export interface LoaderIssueTarget {
  orderId: string;
  outletId: string;
  itemId: string;
  itemName: string;
  expected: number;
  unit: string;
}

export interface LoaderIssue extends LoaderIssueTarget {
  reported: boolean;
  type: LoaderIssueType;
  loaded: number;
  note: string;
  photoAttached: boolean;
  decisionReceived: boolean;
}