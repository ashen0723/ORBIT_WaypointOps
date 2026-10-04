import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowRightIcon } from 'lucide-react';
import { Drawer } from '../ui/Drawer';
import { Button } from '../ui/Button';
import { StatusBadge } from '../dispatch/StatusBadge';
import { useDispatch } from '../../contexts/DispatchContext';
import { MAX_TRIPS_PER_VEHICLE_PER_DAY } from '../../data/rules';
import { formatDate, weekStart } from '../../utils/clock';
import { formatKg, formatL, formatM3, plural, tripLabel } from '../../utils/format';
import { VEHICLE_BADGE, vehicleState } from '../../utils/status';
import { formatDuration, to12h } from '../../utils/time';
import { vehicleDayTrips } from '../../utils/tripValidation';

interface VehicleDrawerProps {
  vehicleId: string | null;
  date: string;
  onClose: () => void;
}

export function VehicleDrawer({ vehicleId, date, onClose }: VehicleDrawerProps) {
  const { getVehicle, getDriver, getDepot, trips, run } = useDispatch();
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const vehicle = vehicleId ? getVehicle(vehicleId) : undefined;
  const mine = vehicle ? vehicleDayTrips(trips, vehicle.id, date) : [];
  const off = vehicle?.unavailable.find((u) => u.date === date);
  const usedMin = mine.reduce((s, t) => s + t.durationMin, 0);
  const wk = weekStart(date);
  const weekFuel = vehicle ? trips.filter((t) => t.vehicleId === vehicle.id && weekStart(t.date) === wk).reduce((s, t) => s + t.fuelL, 0) : 0;

  const setAvailability = async (available: boolean) => {
    if (!vehicle) return;
    setBusy(true);
    const res = await run({ op: 'setVehicleAvailability', vehicleId: vehicle.id, date, available, reason });
    setBusy(false);
    if (res.ok) {
      setReason('');
      toast.success(`${vehicle.id} marked ${available ? 'available' : 'unavailable'} on ${formatDate(date)}`);
    }
  };

  const rows: [string, string][] = vehicle ?
  [
  ['Type', vehicle.type],
  ['Depot', getDepot(vehicle.depotId)?.name ?? vehicle.depotId],
  ['Weight limit', formatKg(vehicle.capacityKg)],
  ['Volume limit', formatM3(vehicle.capacityM3)],
  ['Van access', vehicle.isVan ? 'Yes' : 'No'],
  ['Default driver', getDriver(vehicle.defaultDriverId ?? '')?.name ?? 'Not assigned'],
  ['Trips that day', `${mine.length} / ${MAX_TRIPS_PER_VEHICLE_PER_DAY}`],
  ['Operating time used', `${formatDuration(usedMin)} of ${formatDuration(vehicle.maxDailyMin)}`],
  ['Fuel this week', `${formatL(weekFuel)} of ${formatL(vehicle.weeklyFuelBudgetL)}`]] :

  [];

  return (
    <Drawer open={Boolean(vehicle)} title={vehicle?.id ?? ''} subtitle={vehicle && <StatusBadge badge={VEHICLE_BADGE[vehicleState(vehicle, trips, date)]} size="sm" />} onClose={onClose}>
      <dl className="divide-y divide-line">
        {rows.map(([label, value]) =>
        <div key={label} className="flex justify-between gap-4 py-3 text-sm">
            <dt className="text-subtle">{label}</dt>
            <dd className="text-right font-medium text-ink">{value}</dd>
          </div>
        )}
      </dl>

      <h3 className="mt-6 text-sm font-semibold text-ink">Availability on {formatDate(date)}</h3>
      {off ?
      <div className="mt-2 space-y-2">
          <p className="rounded-2xl bg-danger-pale px-4 py-3 text-sm text-danger-ink">Unavailable: {off.reason}</p>
          <Button variant="secondary" disabled={busy} onClick={() => void setAvailability(true)}>
            Mark available
          </Button>
        </div> :

      <div className="mt-2 flex gap-2">
          <label className="min-w-0 flex-1">
            <span className="sr-only">Reason</span>
            <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason, e.g. Scheduled service"
            className="h-11 w-full rounded-2xl border border-line bg-surface px-4 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand" />
          
          </label>
          <Button variant="secondary" disabled={busy || !reason.trim()} onClick={() => void setAvailability(false)}>
            Mark unavailable
          </Button>
        </div>
      }

      <h3 className="mt-6 text-sm font-semibold text-ink">Trips that day</h3>
      {mine.length === 0 ?
      <p className="mt-2 text-sm text-subtle">No trips.</p> :

      <ul className="mt-2 space-y-2">
          {mine.map((t) =>
        <li key={t.id}>
              <Link
            to={t.status === 'loading' ? `/loading/${t.id}` : `/monitoring/${t.id}`}
            className="flex items-center justify-between gap-3 rounded-2xl border border-line px-4 py-3 text-sm transition-colors duration-150 hover:bg-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
            
                <span>
                  <span className="font-semibold text-ink">{tripLabel(t.number)}</span>
                  <span className="text-subtle">
                    {' '}
                    · {plural(t.stops.length, 'stop')} · {to12h(t.departAt)}–{to12h(t.returnAt)}
                  </span>
                </span>
                <ArrowRightIcon aria-hidden="true" className="h-4 w-4 text-forest" />
              </Link>
            </li>
        )}
        </ul>
      }
    </Drawer>);

}