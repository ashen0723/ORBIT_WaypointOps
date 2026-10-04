import React, { useState } from 'react';
import { CircleCheckIcon, PackageIcon, TriangleAlertIcon, TruckIcon } from 'lucide-react';
import { Button } from '../ui/Button';
import type { Trip } from '../../types/dispatch';
import { formatDateTime } from '../../utils/clock';
import { departureReadiness, missingUnits } from '../../utils/fieldOps';
import { plural } from '../../utils/format';

interface LoadingStatusPanelProps {
  trip: Trip;
  canAct: boolean;
  onAck: (note: string) => void;
  onDepart: () => void;
  onTrack?: () => void;
}

export function LoadingStatusPanel({ trip, canAct, onAck, onDepart, onTrack }: LoadingStatusPanelProps) {
  const [note, setNote] = useState('');
  const r = departureReadiness(trip);
  const missing = r.exceptions.reduce((s, l) => s + missingUnits(l), 0);
  const damaged = r.exceptions.reduce((s, l) => s + l.damagedUnits, 0);
  const zero = r.exceptions.filter((l) => l.loadedUnits === 0).length;

  if (trip.status !== 'loading') {
    return (
      <div className="flex flex-col gap-4 rounded-card bg-brand-pale p-5 sm:flex-row sm:items-center sm:justify-between md:p-6">
        <div className="flex gap-3">
          <TruckIcon aria-hidden="true" className="mt-0.5 h-6 w-6 shrink-0 text-forest" />
          <div>
            <p className="text-lg font-semibold text-forest">Departed</p>
            <p className="text-sm text-ink">{trip.departedAt ? `Left the depot ${formatDateTime(trip.departedAt)}.` : 'On the road.'}</p>
          </div>
        </div>
        {onTrack &&
        <Button size="lg" variant="secondary" onClick={onTrack}>
            Track delivery
          </Button>
        }
      </div>);

  }

  return (
    <div className="space-y-3">
      {r.exceptions.length > 0 &&
      <div role="alert" className="rounded-card bg-amber-pale p-5 md:p-6">
          <div className="flex gap-3">
            <TriangleAlertIcon aria-hidden="true" className="mt-0.5 h-6 w-6 shrink-0 text-amber-ink" />
            <div className="min-w-0 flex-1">
              <p className="text-lg font-semibold text-amber-ink">{plural(r.exceptions.length, 'loading exception')}</p>
              <p className="text-sm text-ink">
                {missing} missing · {damaged} damaged{zero ? ` · ${plural(zero, 'order')} entirely missing (will be deferred automatically)` : ''}. Dispatcher and affected stores can see this.
              </p>
              {trip.exceptionAck ?
            <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-forest">
                  <CircleCheckIcon aria-hidden="true" className="h-4 w-4" />
                  Acknowledged by {trip.exceptionAck.by} · {formatDateTime(trip.exceptionAck.at)}
                  {trip.exceptionAck.note ? ` — ${trip.exceptionAck.note}` : ''}
                </p> :

            canAct &&
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <label className="min-w-0 flex-1">
                      <span className="sr-only">Acknowledgement note</span>
                      <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Note (optional) — e.g. Supervisor approved"
                  className="h-12 w-full rounded-2xl border border-line bg-surface px-4 text-base text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand" />
                
                    </label>
                    <Button
                size="lg"
                onClick={() => {
                  onAck(note);
                  setNote('');
                }}>
                
                      Acknowledge exceptions
                    </Button>
                  </div>

            }
            </div>
          </div>
        </div>
      }

      <div className={`flex flex-col gap-4 rounded-card p-5 sm:flex-row sm:items-center sm:justify-between md:p-6 ${r.ready ? 'bg-brand-pale' : 'bg-surface shadow-card'}`}>
        <div className="flex gap-3">
          {r.ready ? <CircleCheckIcon aria-hidden="true" className="mt-0.5 h-6 w-6 shrink-0 text-forest" /> : <PackageIcon aria-hidden="true" className="mt-0.5 h-6 w-6 shrink-0 text-subtle" />}
          <div>
            <p className={`text-lg font-semibold ${r.ready ? 'text-forest' : 'text-ink'}`}>{r.ready ? 'Ready to depart' : 'Not ready to depart'}</p>
            <p className="text-sm text-ink">{r.ready ? 'Every order is counted and exceptions are acknowledged.' : r.reason}</p>
          </div>
        </div>
        {canAct &&
        <Button size="lg" onClick={onDepart} disabled={!r.ready} className="w-full sm:w-auto">
            <TruckIcon aria-hidden="true" className="h-5 w-5" />
            Release for departure
          </Button>
        }
      </div>
    </div>);

}