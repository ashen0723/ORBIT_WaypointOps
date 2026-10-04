import { apiFetch } from '../../../api/client';
import type { LoadQueueItem, LoaderQueueStatus } from '../types/loader';

export interface LoaderTripSummaryDto {
  tripId: string;
  vehicleId: string;
  tripNo: number;
  date: string;
  plannedDeparture: string | null;
  status: 'READY_TO_LOAD' | 'LOADING' | 'AWAITING_DISPATCHER' | 'READY_TO_DEPART';
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
}

export async function fetchLoaderTrips(
  token: string,
  signal?: AbortSignal,
): Promise<LoadQueueItem[]> {
  const trips = await apiFetch<LoaderTripSummaryDto[]>('/loader/trips', {
    token,
    signal,
  });

  return trips.map(mapLoaderTripSummary);
}

export function mapLoaderTripSummary(trip: LoaderTripSummaryDto): LoadQueueItem {
  return {
    tripId: trip.tripId,
    vehicleId: trip.vehicleId,
    trip: `Trip ${trip.tripNo}`,
    brand: trip.brands.length > 0 ? trip.brands.map(titleCase).join(', ') : 'Mixed',
    departure: trip.plannedDeparture ?? 'Not scheduled',
    stops: trip.stopCount,
    status: mapQueueStatus(trip.status),
    priority: trip.openIssueCount > 0 ? 'High' : 'Standard',
    priorityReason:
      trip.openIssueCount > 0
        ? `${trip.openIssueCount} loading issue${trip.openIssueCount === 1 ? '' : 's'} need attention`
        : undefined,
    vehicleType: trip.vehicle.type === 'VAN' ? 'Van' : 'Truck',
    temperature: trip.vehicle.temperature === 'REEFER' ? 'Reefer' : 'Ambient',
    district: trip.districts.length > 0 ? trip.districts.join(', ') : 'No stops',
    orderCount: trip.orderCount,
    loadedWeightKg: trip.plannedWeightKg,
    weightCapacityKg: trip.vehicle.weightCapacityKg,
    loadedVolumeM3: trip.plannedVolumeM3,
    volumeCapacityM3: trip.vehicle.volumeCapacityM3,
  };
}

function mapQueueStatus(status: LoaderTripSummaryDto['status']): LoaderQueueStatus {
  const statuses: Record<LoaderTripSummaryDto['status'], LoaderQueueStatus> = {
    READY_TO_LOAD: 'ready_to_load',
    LOADING: 'loading',
    AWAITING_DISPATCHER: 'awaiting_dispatcher',
    READY_TO_DEPART: 'ready_to_depart',
  };

  return statuses[status];
}

function titleCase(value: string): string {
  return value.charAt(0) + value.slice(1).toLowerCase();
}
