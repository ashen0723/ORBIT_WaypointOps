import React from 'react';
import { ChevronLeftIcon, CircleCheckIcon, CircleXIcon, Loader2Icon } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { TripFeasibilityPanel } from './TripFeasibilityPanel';
import { useDispatch } from '../../contexts/DispatchContext';
import type { Vehicle } from '../../types/dispatch';
import { CHECK_GROUPS, type TripValidation } from '../../utils/tripValidation';
import { formatDate } from '../../utils/clock';
import { formatKg, formatM3, formatNumber, formatWindow, outletLabel } from '../../utils/format';
import { fromMin, to12h } from '../../utils/time';

interface ReviewTripProps {
  vehicle: Vehicle;
  result: TripValidation;
  busy: boolean;
  serverIssues: string[];
  onBack: () => void;
  onConfirm: () => void;
}

export function ReviewTrip({ vehicle, result, busy, serverIssues, onBack, onConfirm }: ReviewTripProps) {
  const { draft, updateDraft, drivers, getDepot } = useDispatch();
  const weight = result.stops.reduce((s, x) => s + x.order.weightKg, 0);
  const volume = result.stops.reduce((s, x) => s + x.order.volumeM3, 0);
  const depotDrivers = drivers.filter((d) => d.depotId === draft.depotId);
  const ok = result.ok;

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:gap-6">
      <Card className="p-5 md:p-8">
        <h2 className="text-2xl font-semibold tracking-tight text-ink">Review Trip</h2>
        <p className="mt-1 text-subtle">
          {getDepot(draft.depotId)?.name} · {formatDate(draft.date, 'long')}
        </p>

        <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
          {(
          [
          ['Vehicle', `${vehicle.id} · ${vehicle.type}`],
          ['Stops', String(result.stops.length)],
          ['Weight', `${formatNumber(weight)} / ${formatKg(vehicle.capacityKg)}`],
          ['Volume', `${formatNumber(volume)} / ${formatM3(vehicle.capacityM3)}`],
          ['Distance', `${formatNumber(result.distanceKm)} km`],
          ['Departs', to12h(fromMin(result.departMin))],
          ['Returns', to12h(fromMin(result.returnMin))],
          ['Trip of the day', `#${result.feasibility.tripIndex}`]] as
          [string, string][]).
          map(([label, value]) =>
          <div key={label}>
              <dt className="text-xs text-subtle">{label}</dt>
              <dd className="mt-0.5 font-semibold tabular-nums text-ink">{value}</dd>
            </div>
          )}
        </dl>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-semibold text-ink">Driver</span>
            <select
              value={draft.driverId ?? result.driverId ?? ''}
              onChange={(e) => updateDraft({ driverId: e.target.value || null })}
              className="mt-1.5 h-11 w-full rounded-2xl border border-line bg-surface px-3 text-sm font-medium text-ink focus:outline-none focus:ring-2 focus:ring-brand">
              
              <option value="">Vehicle’s default driver</option>
              {depotDrivers.map((d) =>
              <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              )}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-ink">Departure time</span>
            <span className="mt-1.5 flex gap-2">
              <input
                type="time"
                value={draft.departAt ?? fromMin(result.departMin)}
                onChange={(e) => updateDraft({ departAt: e.target.value || null })}
                className="h-11 min-w-0 flex-1 rounded-2xl border border-line bg-surface px-3 text-sm font-medium tabular-nums text-ink focus:outline-none focus:ring-2 focus:ring-brand" />
              
              {draft.departAt &&
              <Button variant="ghost" size="md" onClick={() => updateDraft({ departAt: null })}>
                  Auto
                </Button>
              }
            </span>
            <span className="mt-1 block text-xs text-subtle">{draft.departAt ? 'Manual time — all checks re-run.' : 'Earliest time that fits windows and other trips.'}</span>
          </label>
        </div>

        <h3 className="mt-8 text-sm font-semibold text-ink">Time and fuel</h3>
        <div className="mt-3">
          <TripFeasibilityPanel feasibility={result.feasibility} />
        </div>

        <h3 className="mt-8 text-sm font-semibold text-ink">Planned stops</h3>
        <ol className="mt-3">
          {result.stops.map((s, i) =>
          <li key={s.order.id} className="relative flex gap-4 pb-5 last:pb-0">
              {i < result.stops.length - 1 && <span aria-hidden="true" className="absolute left-4 top-8 h-[calc(100%-2rem)] w-0.5 bg-line" />}
              <span className="relative grid h-8 w-8 shrink-0 place-items-center rounded-full bg-forest text-sm font-semibold text-white">{s.seq}</span>
              <div className="min-w-0 pt-1">
                <p className="font-semibold text-ink">{outletLabel(s.outlet)}</p>
                <p className="text-sm text-subtle">
                  {s.order.id} · {s.order.units} u · {formatNumber(s.legKm)} km, {s.travelMin} min drive
                </p>
                <p className="mt-0.5 text-sm text-ink">
                  Arrives {to12h(fromMin(s.arrival))}
                  {s.wait > 0 && <span className="text-subtle"> · waits {s.wait} min</span>} · unload {s.handling} min <span className="text-subtle">· window {formatWindow(s.order.windowStart, s.order.windowEnd)}</span>
                </p>
              </div>
            </li>
          )}
        </ol>
      </Card>

      <Card className="p-5 md:p-6 lg:sticky lg:top-24">
        <h3 className="text-sm font-semibold text-ink">Checks</h3>
        <ul className="mt-3 space-y-1.5">
          {CHECK_GROUPS.map((c) => {
            const passed = result.passed[c.group];
            return (
              <li key={c.group} className={`flex items-center gap-2.5 rounded-2xl px-4 py-2.5 text-sm font-semibold ${passed ? 'bg-brand-pale text-forest' : 'bg-danger-pale text-danger-ink'}`}>
                {passed ? <CircleCheckIcon aria-hidden="true" className="h-4 w-4 shrink-0" /> : <CircleXIcon aria-hidden="true" className="h-4 w-4 shrink-0" />}
                {passed ? c.ok : c.bad}
              </li>);

          })}
        </ul>
        {!ok &&
        <ul className="mt-3 space-y-1 text-sm text-danger-ink">
            {result.issues.map((i) =>
          <li key={i.key}>• {i.message}</li>
          )}
          </ul>
        }
        {serverIssues.length > 0 &&
        <div role="alert" className="mt-3 rounded-2xl bg-danger-pale p-3 text-sm text-danger-ink">
            <p className="font-semibold">The server rejected this trip:</p>
            <ul className="mt-1 space-y-0.5">
              {serverIssues.map((d) =>
            <li key={d}>• {d.split('|')[1] ?? d}</li>
            )}
            </ul>
          </div>
        }

        <div className="mt-6 space-y-2">
          <Button size="lg" fullWidth disabled={!ok || busy} onClick={onConfirm}>
            {busy && <Loader2Icon aria-hidden="true" className="h-5 w-5 animate-spin" />}
            Confirm Trip
          </Button>
          <Button size="lg" variant="secondary" fullWidth onClick={onBack}>
            <ChevronLeftIcon aria-hidden="true" className="h-5 w-5" />
            Back to Edit
          </Button>
        </div>
        <p className="mt-3 text-center text-sm text-subtle">{ok ? 'The server re-checks every rule before saving.' : 'Fix every failing check to continue.'}</p>
      </Card>
    </div>);

}