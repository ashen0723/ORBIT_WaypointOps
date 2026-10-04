import React from 'react';
import { ArrowRightIcon, RefreshCwIcon } from 'lucide-react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { PageIntro } from '../../components/driver/PageIntro';
import { StopTimeline } from '../../components/driver/StopTimeline';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { useDriver } from '../../contexts/DriverContext';
import { TRIPS } from '../../data/driver';
import { useSyncQueue } from '../../hooks/useSyncQueue';

export function StopList() {
  const { tripId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { connection, lastSyncedAt, conflictPending, getStopRecord, enterOfflineDemo, beginReconnect, acknowledgeConflict, isTripResolved } = useDriver();
  const queue = useSyncQueue();
  const trip = TRIPS.find((candidate) => candidate.id === tripId);
  if (!trip) return null;
  const completed = trip.stops.filter((stop) => ['Delivered', 'Partially delivered', 'Failed', 'Changed by dispatcher'].includes(getStopRecord(trip.id, stop.sequence).status)).length;
  const progress = completed / trip.stops.length * 100;
  const selectedMatch = location.pathname.match(/\/stops\/(\d+)/);
  const selectedSequence = selectedMatch ? Number(selectedMatch[1]) : undefined;

  return (
    <div className="space-y-5">
      {connection === 'online' && conflictPending && trip.id === 'trip-1' &&
      <section className="rounded-card border-2 border-danger bg-danger-pale p-4 text-danger-ink xl:hidden">
          <h2 className="font-bold">Route changed while offline</h2>
          <p className="mt-2 text-sm leading-6">The Dispatcher moved Stop 5 (OUT072) to VEH048. Do not deliver this stop.</p>
          <Button size="lg" fullWidth className="mt-4" onClick={acknowledgeConflict}>Understood</Button>
        </section>
      }
      <PageIntro meta={`${trip.brand} · ${trip.district}`} title={`Trip ${trip.number} route`} description="Stops are ordered by Dispatch and cannot be changed here." />
      <section className="rounded-panel bg-forest p-4 text-white shadow-card" aria-label="Trip progress">
        <div className="flex items-center justify-between gap-3"><p className="font-semibold">Trip progress</p><p className="whitespace-nowrap text-sm font-bold text-brand-pale">{completed} of {trip.stops.length} delivered</p></div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/20"><div className="h-full rounded-full bg-brand-mint" style={{ width: `${progress}%` }} /></div>
      </section>
      {connection === 'offline' && <Card className="border border-amber/40 p-4 xl:hidden"><p className="font-semibold text-ink">Waiting to sync</p><p className="mt-2 text-sm text-subtle">{queue.deliveries} deliveries, {queue.photos} photos, {queue.issues} issue report</p><p className="mt-1 text-xs text-subtle">Last synced {lastSyncedAt}</p></Card>}
      <StopTimeline trip={trip} selectedSequence={selectedSequence} />
      {connection === 'online' && !conflictPending && trip.id === 'trip-1' && completed === 3 &&
      <Button size="lg" fullWidth onClick={enterOfflineDemo}>Continue route — preview lost signal</Button>
      }
      {connection === 'offline' &&
      <div className="space-y-3">
          <Button size="lg" fullWidth onClick={beginReconnect}><RefreshCwIcon aria-hidden className="h-5 w-5" />Signal restored — reconnect</Button>
          <Link to="/report-issue?offline=1" className="inline-flex min-h-12 w-full items-center justify-center rounded-full border border-line bg-surface px-5 text-sm font-semibold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">Report another issue offline</Link>
        </div>
      }
      {connection === 'online' && !conflictPending && isTripResolved(trip.id) &&
      <Button size="lg" fullWidth onClick={() => navigate(`/trips/${trip.id}/complete`)}>View trip summary<ArrowRightIcon aria-hidden className="h-5 w-5" /></Button>
      }
    </div>);

}