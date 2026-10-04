import { evaluatePlan, type PlanningData } from './planning.engine';
import { localInstant, planInput, weekStart } from './planning.input';
import type { PlanInput } from '@waypoint/contracts';

export const plan: PlanInput = { date: '2026-10-05', depotId: 'D', vehicleId: 'V', plannedDeparture: '05:00', orderIds: ['O'] };
export function fixture(): PlanningData {
  const stamp = new Date('2026-10-01T00:00:00Z');
  return {
    vehicle: { id: 'V', depotId: 'D', type: 'TRUCK', temp: 'REEFER', weightCapKg: 100, volumeCapM3: 10, fuelType: 'diesel', kmPerL: 10, weeklyFuelQuotaL: 20, available: true, drivers: [{ id: 'driver' }], createdAt: stamp, updatedAt: stamp },
    orders: [{ id: 'O', outletId: 'A', temp: 'CHILLED', requestedDate: new Date(plan.date), plannedDate: null, status: 'CONFIRMED', units: 20, weightKg: 80, volumeM3: 8, deferralCount: 0, deferReason: null, deferredToDate: null, version: 1, recoveryPending: false, pendingQuantities: null, createdById: 'store', createdAt: stamp, updatedAt: stamp,
      outlet: { id: 'A', name: 'Outlet', brand: 'FRESH', district: 'Colombo', depotId: 'D', dockType: 'REAR_DOCK', parkingConstraint: 'NORMAL', mallWindow: null, windowOpenTime: '04:00', windowCloseTime: '10:00', createdAt: stamp, updatedAt: stamp },
      lines: [{ id: 'L', orderId: 'O', item: 'Item', unit: 'box', requestedQty: 20, cancelledQty: 0, unitWeightKg: null, unitVolumeM3: null, loadedQty: null, deliveredQty: null, createdAt: stamp, updatedAt: stamp }], stops: [] }],
    trips: [], operatingDay: { date: new Date(plan.date), operating: true }, availability: null,
    legs: [{ id: 'out', fromKey: 'depot:D', toKey: 'outlet:A', distanceKm: 40, durationMin: 30, source: 'test' }, { id: 'back', fromKey: 'outlet:A', toKey: 'depot:D', distanceKm: 60, durationMin: 45, source: 'test' }],
    handling: [{ outletId: 'A', serviceMin: 15, source: 'test' }],
  };
}
const codes = (data: PlanningData, p = plan) => evaluatePlan(p, data).reasons.map(r => r.code);
function existingTrip(data: PlanningData, overrides: Record<string, unknown> = {}) {
  data.trips.push({ id: 'T', vehicleId: 'V', depotId: 'D', date: new Date(plan.date), tripNo: 1, status: 'CONFIRMED', plannedDeparture: '09:00', totalWeightKg: 10, totalVolumeM3: 1, distanceKm: 50, createdAt: new Date(), updatedAt: new Date(), version: 1, planVersion: 1, driverId: 'driver', publishedAt: null, loaderAcknowledgedPlanVersion: null, releasedAt: null, plannedDepartureAt: localInstant(plan.date, '09:00'), plannedReturnAt: localInstant(plan.date, '10:00'), fuelWeekStart: weekStart(plan.date), reservedFuelL: 5, committedFuelL: 0, ...overrides });
}
describe('authoritative planning feasibility', () => {
  it('includes service and directed return travel/fuel', () => {
    const result = evaluatePlan(plan, fixture());
    expect(result.valid).toBe(true);
    expect(result.totals).toMatchObject({ weightKg: 80, volumeM3: 8, distanceKm: 100, estimatedFuelL: 10, durationMin: 90 });
  });
  it('reports weight and volume independently', () => {
    const d = fixture(); d.orders[0].weightKg = 101; d.orders[0].volumeM3 = 11;
    expect(codes(d)).toEqual(expect.arrayContaining(['WEIGHT_EXCEEDED', 'VOLUME_EXCEEDED']));
  });
  it('accepts exact capacity, rejects even a small overage without rounding', () => {
    const d = fixture(); d.orders[0].weightKg = 100; expect(codes(d)).not.toContain('WEIGHT_EXCEEDED');
    d.orders[0].weightKg += 0.00001; expect(codes(d)).toContain('WEIGHT_EXCEEDED');
  });
  it('enforces cold chain, van-only, and home depot', () => {
    const d = fixture(); d.vehicle!.temp = 'AMBIENT'; d.orders[0].outlet.parkingConstraint = 'VAN_ONLY'; d.orders[0].outlet.depotId = 'OTHER';
    expect(codes(d)).toEqual(expect.arrayContaining(['REEFER_REQUIRED', 'VAN_REQUIRED', 'DEPOT_MISMATCH']));
  });
  it('permits ambient goods on a reefer', () => { const d = fixture(); d.orders[0].temp = 'AMBIENT'; expect(evaluatePlan(plan, d).valid).toBe(true); });
  it('requires a single active driver and vehicle availability', () => {
    const d = fixture(); d.vehicle!.drivers = []; d.availability = { id: 'AV', vehicleId: 'V', date: new Date(plan.date), available: false };
    expect(codes(d)).toEqual(expect.arrayContaining(['DRIVER_NOT_CONFIGURED', 'VEHICLE_UNAVAILABLE']));
  });
  it('fails closed for missing reference data, including the return leg', () => {
    const d = fixture(); d.legs.pop(); d.operatingDay = null; d.handling = [];
    const result = evaluatePlan(plan, d); expect(result.valid).toBe(false); expect(result.totals).toBeNull(); expect(result.stops).toEqual([]);
  });
  it('rejects nonoperating dates', () => { const d = fixture(); d.operatingDay!.operating = false; expect(codes(d)).toContain('NON_OPERATING_DATE'); });
  it('waits for receiving window and includes that wait in route time', () => {
    const d = fixture(); d.orders[0].outlet.windowOpenTime = '06:00'; expect(evaluatePlan(plan, d).totals?.durationMin).toBe(120);
  });
  it('requires service start within both receiving and mall windows', () => {
    const d = fixture(); d.orders[0].outlet.mallWindow = '06:00-06:30';
    expect(codes(d, { ...plan, plannedDeparture: '06:15' })).toContain('WINDOW_CONFLICT');
  });
  it('Fresh arrival at exactly 08:00 fails, 07:59 succeeds', () => {
    expect(codes(fixture(), { ...plan, plannedDeparture: '07:30' })).toContain('FRESH_DEADLINE');
    expect(codes(fixture(), { ...plan, plannedDeparture: '07:29' })).not.toContain('FRESH_DEADLINE');
  });
  it('rejects overlap including return, permits touching intervals', () => {
    const d = fixture(); existingTrip(d, { plannedDepartureAt: localInstant(plan.date, '06:29') });
    expect(codes(d)).toContain('VEHICLE_CONFLICT'); d.trips[0].plannedDepartureAt = localInstant(plan.date, '06:30'); expect(codes(d)).not.toContain('VEHICLE_CONFLICT');
  });
  it('rejects third route but ignores released assignments and own amendment reservation', () => {
    const d = fixture(); existingTrip(d); existingTrip(d, { id: 'T2', tripNo: 2 }); expect(codes(d)).toContain('TRIP_LIMIT');
    expect(evaluatePlan(plan, d, 'T').reasons.map(r => r.code)).not.toContain('TRIP_LIMIT');
    d.trips[0].releasedAt = new Date(); expect(codes(d)).not.toContain('TRIP_LIMIT');
  });
  it('uses reservations plus committed fuel without counting the previous week', () => {
    const d = fixture(); existingTrip(d, { reservedFuelL: 6, committedFuelL: 5 }); expect(codes(d)).toContain('FUEL_QUOTA_EXCEEDED');
    d.trips[0].fuelWeekStart = new Date('2026-09-28'); expect(codes(d)).not.toContain('FUEL_QUOTA_EXCEEDED');
  });
  it('rejects duplicate active assignment but permits own existing assignment', () => {
    const d = fixture(); d.orders[0].status = 'PLANNED';
    d.orders[0].stops.push({ id: 'S', orderId: 'O', tripId: 'T', sequence: 1, status: 'PLANNED', active: true, etaTime: null, plannedArrivalAt: null, arrivedAt: null, reschedule: null, createdAt: new Date(), updatedAt: new Date(), lines: [{ id: 'SL', stopId: 'S', orderLineId: 'L', version: 1, plannedQty: 20, cancelledQty: 0, loadedQty: null, deliveredQty: null, returnedQty: null, pendingUnload: false }] });
    expect(codes(d)).toContain('DUPLICATE_ASSIGNMENT'); expect(evaluatePlan(plan, d, 'T').valid).toBe(true);
  });
  it('does not silently allocate cancelled/recovery quantities as a fresh order', () => {
    const d = fixture(); d.orders[0].lines[0].cancelledQty = 4; expect(codes(d)).toContain('ORDER_NOT_ELIGIBLE');
  });
});
describe('wire/date parsing', () => {
  it('computes Monday fuel week across year boundary', () => { expect(weekStart('2027-01-03').toISOString().slice(0,10)).toBe('2026-12-28'); expect(weekStart('2027-01-04').toISOString().slice(0,10)).toBe('2027-01-04'); });
  it.each([{ ...plan, date: '2026-02-30' }, { ...plan, plannedDeparture: '24:00' }, { ...plan, orderIds: ['O','O'] }, { ...plan, orderIds: [] }])('rejects malformed plan %j', p => { expect(() => planInput(p)).toThrow(); });
});
