import type { OrderView, StopStatus, TripStatus, TripView } from '@waypoint/contracts';
import type { DeliveryStatus, DriverStop, DriverTrip } from '../types/driver';

/** Backend → Driver UI vocabulary. The UI labels are presentation only; the server enums stay the source of truth. */
export const TRIP_STATUS: Record<TripStatus, DeliveryStatus> = {
  DRAFT: 'Planned',
  CONFIRMED: 'Planned',
  LOADING: 'Planned',
  READY: 'Loaded',
  IN_TRANSIT: 'Out for delivery',
  COMPLETED: 'Delivered',
  COMPLETED_WITH_EXCEPTIONS: 'Delivered',
};
export const STOP_STATUS: Record<StopStatus, DeliveryStatus | null> = {
  PLANNED: null, // the UI derives Loaded / Out for delivery from the trip
  ARRIVED: 'Arrived',
  DELIVERED: 'Delivered',
  PARTIAL: 'Partially delivered',
  FAILED: 'Failed',
  RESCHEDULED: 'Changed by dispatcher',
};
export const isDeparted = (trip: TripView) => ['IN_TRANSIT', 'COMPLETED', 'COMPLETED_WITH_EXCEPTIONS'].includes(trip.status);

const BRAND: Record<OrderView['brand'], DriverTrip['brand']> = { FRESH: 'Waypoint Fresh', STYLE: 'Waypoint Style', TECH: 'Waypoint Tech' };

/** HH:MM in Asia/Colombo for an RFC 3339 instant. */
export function colomboTime(instant: string): string {
  return new Date(instant).toLocaleTimeString('en-GB', { timeZone: 'Asia/Colombo', hour: '2-digit', minute: '2-digit', hour12: false });
}

/** Lines loaded below their (cancellation-adjusted) plan, as the Loader left them. */
export function loaderFlag(trip: TripView, orders: Record<string, OrderView>): string | undefined {
  const notes = trip.stops.flatMap(stop => stop.lines
    .filter(line => line.cancelledQty > 0 || (line.loadedQty !== null && line.loadedQty < line.plannedQty - line.cancelledQty))
    .map(line => {
      const name = orders[stop.orderId]?.lines.find(l => l.id === line.orderLineId)?.item ?? line.orderLineId;
      const loaded = line.loadedQty ?? line.plannedQty - line.cancelledQty;
      return `Stop ${stop.sequence} (${stop.outletId}): ${name} loaded ${loaded} of ${line.plannedQty}`;
    }));
  return notes.length ? notes.join('; ') : undefined;
}

export function toDriverTrip(trip: TripView, orders: Record<string, OrderView>, district: string): DriverTrip {
  const stops: DriverStop[] = trip.stops.map(stop => {
    const order = orders[stop.orderId];
    const chilled = order ? order.temp !== 'AMBIENT' : false;
    const items = stop.lines.map(line => ({
      id: line.orderLineId,
      name: order?.lines.find(l => l.id === line.orderLineId)?.item ?? line.orderLineId,
      planned: line.plannedQty - line.cancelledQty,
      loaded: line.loadedQty ?? undefined,
      chilled,
    }));
    const cases = items.reduce((sum, item) => sum + item.planned, 0);
    const eta = colomboTime(stop.plannedArrivalAt);
    return {
      id: stop.id,
      orderId: stop.orderId,
      sequence: stop.sequence,
      outletId: stop.outletId,
      // Outlet names/addresses are not exposed to the Driver role yet; show the stable outlet ID.
      name: stop.outletId,
      address: '',
      window: `Planned ${eta}`,
      eta,
      unloading: 'Confirm unloading with dispatch',
      access: 'unknown',
      cases,
      chilledCases: chilled ? cases : 0,
      contactName: 'Outlet receiving team',
      contactPhone: '',
      accessNote: 'Access and window details are shared by Dispatch.',
      items,
    };
  });
  const firstOrder = trip.stops.map(s => orders[s.orderId]).find(Boolean);
  return {
    id: trip.id,
    number: trip.tripNo,
    brand: firstOrder ? BRAND[firstOrder.brand] : 'Waypoint Fresh',
    district,
    departure: colomboTime(trip.plannedDepartureAt),
    status: TRIP_STATUS[trip.status],
    stops,
    loaderFlag: loaderFlag(trip, orders),
  };
}
