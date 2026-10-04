export type LoaderQueueStatus =
  | 'READY_TO_LOAD'
  | 'LOADING'
  | 'AWAITING_DISPATCHER'
  | 'READY_TO_DEPART';

export interface LoaderTripSummary {
  tripId: string;
  vehicleId: string;
  tripNo: number;
  date: string;
  plannedDeparture: string | null;
  status: LoaderQueueStatus;
  tripStatus: string;
  loadingRecordStatus: string;
  stopCount: number;
  orderCount: number;
  openIssueCount: number;
  districts: string[];
  brands: string[];
  plannedWeightKg: number;
  plannedVolumeM3: number;
  vehicle: {
    type: string;
    temperature: string;
    weightCapacityKg: number;
    volumeCapacityM3: number;
  };
  stops: Array<{
    tripStopId: string;
    sequence: number;
    orderId: string;
    outletId: string;
    outletName: string;
    district: string;
    brand: string;
    etaTime: string | null;
  }>;
}

export interface LoaderTripDetail {
  tripId: string;
  vehicleId: string;
  tripNo: number;
  date: string;
  plannedDeparture: string | null;
  tripStatus: string;
  plannedWeightKg: number;
  plannedVolumeM3: number;
  vehicle: LoaderTripSummary['vehicle'];
  loadingRecord: {
    id: string;
    status: string;
    checkedById: string;
    startedAt: string | null;
    completedAt: string | null;
  } | null;
  stops: Array<{
    tripStopId: string;
    sequence: number;
    etaTime: string | null;
    order: {
      orderId: string;
      temperature: string;
      weightKg: number;
      volumeM3: number;
      outlet: {
        outletId: string;
        name: string;
        district: string;
        brand: string;
        dockType: string;
        parkingConstraint: string;
        deliveryWindow: {
          opensAt: string;
          closesAt: string;
          mallWindow: string | null;
        };
      };
      lines: Array<{
        orderLineId: string;
        item: string;
        unit: string;
        expectedQty: number;
        loadedQty: number;
      }>;
    };
  }>;
  issues: Array<{
    issueId: string;
    orderLineId: string;
    type: string;
    expectedQty: number;
    availableQty: number;
    note: string | null;
    evidenceRef: string | null;
    decision: string | null;
    status: string;
    createdAt: string;
    updatedAt: string;
  }>;
}

export interface LoadingStartResult {
  loadingRecordId: string;
  tripId: string;
  tripStatus: string;
  loadingStatus: string;
  checkedById: string;
  startedAt: string | null;
  alreadyStarted: boolean;
}

export interface UpdateLoadedQuantityBody {
  loadedQty: number;
}

export interface LoadedQuantityResult {
  orderLineId: string;
  tripId: string;
  expectedQty: number;
  loadedQty: number;
  complete: boolean;
}

export interface CreateLoadingIssueBody {
  orderLineId: string;
  type: 'MISSING' | 'DAMAGED';
  availableQty: number;
  note?: string;
  evidenceRef?: string;
}

export interface LoadingIssueResult {
  issueId: string;
  tripId: string;
  loadingRecordId: string;
  orderLineId: string;
  type: string;
  expectedQty: number;
  availableQty: number;
  shortfallQty: number;
  note: string | null;
  evidenceRef: string | null;
  status: string;
  decision: string | null;
  createdAt: string;
}
