import React from 'react';
import { CircleCheckIcon, CircleXIcon } from 'lucide-react';
import { FRESH_DEADLINE } from '../../data/rules';
import type { TripFeasibility } from '../../utils/tripValidation';
import { formatL, tripLabel } from '../../utils/format';
import { formatDuration, to12h } from '../../utils/time';

export function TripFeasibilityPanel({ feasibility: f }: {feasibility: TripFeasibility;}) {
  return (
    <div className="space-y-2">
      <div className="grid gap-2 sm:grid-cols-2">
        <Meter
          rows={[
          ['This trip', formatDuration(f.tripMin)],
          ['Already used that day', formatDuration(f.usedMinToday)],
          ['Daily limit', formatDuration(f.maxDailyMin)]]
          }
          used={f.usedMinToday + f.tripMin}
          cap={f.maxDailyMin}
          ok={f.fitsTime}
          okText="Fits daily operating time"
          badText="Operating time exceeded" />
        
        <Meter
          rows={[
          ['This trip', formatL(f.fuelL)],
          ['Used this week', formatL(f.weekFuelUsedL)],
          ['Weekly budget', formatL(f.weeklyBudgetL)]]
          }
          used={f.weekFuelUsedL + f.fuelL}
          cap={f.weeklyBudgetL}
          ok={f.fitsFuel}
          okText="Fits weekly fuel budget"
          badText="Weekly fuel exceeded" />
        
      </div>
      {f.sameDayTrips.length > 0 &&
      <p className="rounded-2xl bg-canvas px-4 py-3 text-sm text-ink">
          Vehicle’s other trips that day: {f.sameDayTrips.map((t) => `${tripLabel(t.number)} ${to12h(t.departAt)}–${to12h(t.returnAt)}`).join(' · ')}
        </p>
      }
      {f.fresh && <FreshDeadlineNote lastArrival={f.fresh.lastArrival} late={f.fresh.late} />}
    </div>);

}

export function FreshDeadlineNote({ lastArrival, late }: {lastArrival?: string;late?: boolean;}) {
  return (
    <div className={`flex gap-3 rounded-2xl px-4 py-3 text-sm ${late ? 'bg-danger-pale' : 'bg-canvas'}`}>
      {late ? <CircleXIcon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-danger-ink" /> : <CircleCheckIcon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-forest" />}
      <div>
        <p className="font-semibold text-ink">Fresh must arrive by {to12h(FRESH_DEADLINE)}</p>
        {lastArrival &&
        <p className={`mt-0.5 ${late ? 'text-danger-ink' : 'text-subtle'}`}>
            {late ? `Last Fresh stop reached ~${to12h(lastArrival)} — this blocks confirmation.` : `Last Fresh stop reached ~${to12h(lastArrival)}.`}
          </p>
        }
      </div>
    </div>);

}

interface MeterProps {
  rows: [string, string][];
  used: number;
  cap: number;
  ok: boolean;
  okText: string;
  badText: string;
}

function Meter({ rows, used, cap, ok, okText, badText }: MeterProps) {
  const pct = cap ? Math.min(100, used / cap * 100) : 0;
  return (
    <div className="flex flex-col rounded-2xl bg-canvas p-4">
      <dl className="space-y-1 text-sm">
        {rows.map(([label, value]) =>
        <div key={label} className="flex items-baseline justify-between gap-3">
            <dt className="text-subtle">{label}</dt>
            <dd className="font-semibold tabular-nums text-ink">{value}</dd>
          </div>
        )}
      </dl>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface" aria-hidden="true">
        <div className={`h-full rounded-full ${ok ? 'bg-brand' : 'bg-danger'}`} style={{ width: `${pct}%` }} />
      </div>
      <p className={`mt-3 flex items-start gap-2 text-sm font-semibold ${ok ? 'text-forest' : 'text-danger-ink'}`}>
        {ok ? <CircleCheckIcon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" /> : <CircleXIcon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />}
        {ok ? okText : badText}
      </p>
    </div>);

}