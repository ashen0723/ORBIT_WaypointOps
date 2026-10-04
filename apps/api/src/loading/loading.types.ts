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
