import { apiFetch } from '../../../api/client';
import type {
  LoadQueueItem,
  LoaderIssue,
  LoaderQueueStatus,
} from '../types/loader';
import type { LoaderTripView } from '../contexts/LoaderContext';

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

export interface LoaderTripDetailDto {
  tripId: string;
  vehicleId: string;
  tripNo: number;
  date: string;
  plannedDeparture: string | null;
  tripStatus: string;
  plannedWeightKg: number;
  plannedVolumeM3: number;
  vehicle: LoaderTripSummaryDto['vehicle'];
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
    acknowledgedById: string | null;
    acknowledgedAt: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
}

export interface MappedLoaderTripDetail {
  trip: LoaderTripView;
  quantities: Record<string, number>;
  confirmedItemIds: string[];
  issues: Record<string, LoaderIssue>;
}

export interface LoadingStartDto {
  loadingRecordId: string;
  tripId: string;
  tripStatus: string;
  loadingStatus: string;
  checkedById: string;
  startedAt: string | null;
  alreadyStarted: boolean;
}

export interface LoadedQuantityDto {
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
  replacementLoaded?: boolean;
  note?: string;
  evidenceRef?: string;
}

export interface LoadingIssueDto {
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
  decision: string | null;
  status: string;
  createdAt: string;
}

export interface AcknowledgeLoadingIssueDto {
  issueId: string;
  tripId: string;
  status: string;
  decision: string | null;
  acknowledgedById: string | null;
  acknowledgedAt: string;
  alreadyAcknowledged: boolean;
}

export interface ReadyTripBlocker {
  type: string;
  issueId?: string;
  orderLineId?: string;
  expectedQty?: number;
  loadedQty?: number;
}

export interface ReadyTripDto {
  tripId: string;
  tripStatus: 'READY';
  loadingRecordId: string;
  loadingStatus: 'COMPLETED';
  completedAt: string;
  alreadyReady: boolean;
  shortfalls: Array<{
    issueId: string;
    orderLineId: string;
    expectedQty: number;
    loadedQty: number;
    shortfallQty: number;
  }>;
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

export async function fetchLoaderTrip(
  token: string,
  tripId: string,
  queueItem?: LoadQueueItem,
): Promise<MappedLoaderTripDetail> {
  const detail = await apiFetch<LoaderTripDetailDto>(
    `/trips/${encodeURIComponent(tripId)}/loading`,
    { token },
  );

  return mapLoaderTripDetail(detail, queueItem);
}

export function startLoadingTrip(token: string, tripId: string): Promise<LoadingStartDto> {
  return apiFetch<LoadingStartDto>(`/loading/${encodeURIComponent(tripId)}/start`, {
    method: 'POST',
    token,
  });
}

export function updateLoadedQuantity(
  token: string,
  orderLineId: string,
  loadedQty: number,
): Promise<LoadedQuantityDto> {
  return apiFetch<LoadedQuantityDto>(
    `/loading/lines/${encodeURIComponent(orderLineId)}`,
    {
      method: 'PATCH',
      token,
      body: JSON.stringify({ loadedQty }),
    },
  );
}

export function createLoadingIssue(
  token: string,
  tripId: string,
  body: CreateLoadingIssueBody,
): Promise<LoadingIssueDto> {
  return apiFetch<LoadingIssueDto>(
    `/loading/${encodeURIComponent(tripId)}/issues`,
    {
      method: 'POST',
      token,
      body: JSON.stringify(body),
    },
  );
}

export function acknowledgeLoadingIssue(
  token: string,
  issueId: string,
): Promise<AcknowledgeLoadingIssueDto> {
  return apiFetch<AcknowledgeLoadingIssueDto>(
    `/loading/issues/${encodeURIComponent(issueId)}/acknowledge`,
    {
      method: 'POST',
      token,
    },
  );
}

export function markTripReady(
  token: string,
  tripId: string,
): Promise<ReadyTripDto> {
  return apiFetch<ReadyTripDto>(
    `/trips/${encodeURIComponent(tripId)}/ready`,
    {
      method: 'POST',
      token,
    },
  );
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

export function mapLoaderTripDetail(
  detail: LoaderTripDetailDto,
  existingQueueItem?: LoadQueueItem,
): MappedLoaderTripDetail {
  const orders = detail.stops.map((stop) => ({
    id: stop.order.orderId,
    outletId: stop.order.outlet.outletId,
    outletName: stop.order.outlet.name,
    location: stop.order.outlet.district,
    stop: stop.sequence,
    tripStopId: stop.tripStopId,
    weightKg: stop.order.weightKg,
    volumeM3: stop.order.volumeM3,
    items: stop.order.lines.map((line) => ({
      id: line.orderLineId,
      orderLineId: line.orderLineId,
      name: line.item,
      expected: line.expectedQty,
      loaded: line.loadedQty,
      unit: line.unit,
      condition: stop.order.temperature === 'CHILLED' ? 'chilled' as const : 'ambient' as const,
    })),
  }));

  const stops = detail.stops.map((stop) => ({
    id: stop.tripStopId,
    number: stop.sequence,
    outletId: stop.order.outlet.outletId,
    outletName: stop.order.outlet.name,
    location: stop.order.outlet.district,
    orderIds: [stop.order.orderId],
    conditions: formatStopConditions(stop),
    eta: stop.etaTime ?? undefined,
  }));

  const quantities = Object.fromEntries(
    orders.flatMap((order) => order.items.map((item) => [item.id, item.loaded])),
  );
  const confirmedItemIds = orders.flatMap((order) =>
    order.items.filter((item) => item.loaded >= item.expected).map((item) => item.id),
  );
  const itemById = new Map(
    orders.flatMap((order) => order.items.map((item) => [item.id, { order, item }] as const)),
  );
  const issues = Object.fromEntries(detail.issues.flatMap((issue) => {
    const target = itemById.get(issue.orderLineId);
    if (!target) return [];

    return [[issue.orderLineId, {
      issueId: issue.issueId,
      tripId: detail.tripId,
      orderLineId: issue.orderLineId,
      orderId: target.order.id,
      outletId: target.order.outletId,
      itemId: issue.orderLineId,
      itemName: target.item.name,
      expected: issue.expectedQty,
      unit: target.item.unit,
      reported: true,
      type: issue.type.toLowerCase() === 'damaged' ? 'damaged' : 'missing',
      loaded: issue.availableQty,
      note: issue.note ?? '',
      photoAttached: Boolean(issue.evidenceRef),
      decisionReceived: Boolean(issue.acknowledgedAt),
      resolution: mapIssueResolution(issue.status),
      dispatcherDecision: issue.decision ?? undefined,
      dispatcherDecisionAt: issue.updatedAt,
      approvedShipQuantity: issue.status === 'SHIP_SHORT' ? issue.availableQty : undefined,
      cancelledQuantity:
        issue.status === 'SHIP_SHORT' ? issue.expectedQty - issue.availableQty : undefined,
    } satisfies LoaderIssue]];
  }));

  const queueItem = existingQueueItem ?? detailQueueItem(detail);

  return {
    trip: { tripId: detail.tripId, queueItem, orders, stops },
    quantities,
    confirmedItemIds,
    issues,
  };
}

function detailQueueItem(detail: LoaderTripDetailDto): LoadQueueItem {
  const districts = [...new Set(detail.stops.map((stop) => stop.order.outlet.district))];
  const brands = [...new Set(detail.stops.map((stop) => stop.order.outlet.brand))];
  const openIssueCount = detail.issues.filter((issue) => issue.status === 'OPEN').length;

  return mapLoaderTripSummary({
    tripId: detail.tripId,
    vehicleId: detail.vehicleId,
    tripNo: detail.tripNo,
    date: detail.date,
    plannedDeparture: detail.plannedDeparture,
    status:
      detail.tripStatus === 'READY'
        ? 'READY_TO_DEPART'
        : openIssueCount > 0
          ? 'AWAITING_DISPATCHER'
          : detail.loadingRecord?.status === 'IN_PROGRESS'
            ? 'LOADING'
            : 'READY_TO_LOAD',
    tripStatus: detail.tripStatus,
    loadingRecordStatus: detail.loadingRecord?.status ?? 'NOT_STARTED',
    stopCount: detail.stops.length,
    orderCount: detail.stops.length,
    openIssueCount,
    districts,
    brands,
    plannedWeightKg: detail.plannedWeightKg,
    plannedVolumeM3: detail.plannedVolumeM3,
    vehicle: detail.vehicle,
  });
}

function formatStopConditions(stop: LoaderTripDetailDto['stops'][number]): string {
  const outlet = stop.order.outlet;
  const access = outlet.parkingConstraint === 'VAN_ONLY'
    ? 'Van only'
    : outlet.dockType.split('_').map(titleCase).join(' ');
  const window = outlet.deliveryWindow.mallWindow
    ?? `${outlet.deliveryWindow.opensAt}-${outlet.deliveryWindow.closesAt}`;
  return `${access} · ${window}`;
}

function mapIssueResolution(status: string): LoaderIssue['resolution'] {
  if (status === 'REPLACEMENT_LOADED') return 'replacement_loaded';
  if (status === 'SHIP_SHORT') return 'ship_short';
  if (status === 'RESOLVED') return 'resolved';
  return 'open';
}
