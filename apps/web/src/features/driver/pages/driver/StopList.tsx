import { ArrowRightIcon } from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { PageIntro } from '../../components/driver/PageIntro';
import { StopTimeline } from '../../components/driver/StopTimeline';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { useDriver } from '../../contexts/DriverContext';
import { useSyncQueue } from '../../hooks/useSyncQueue';

export function StopList() {
  const { tripId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { trips: TRIPS, connection, lastSyncedAt, conflictPending, getStopRecord, isTripResolved } = useDriver();
  const queue = useSyncQueue();
  const trip = TRIPS.find((candidate) => candidate.id === tripId);
  if (!trip) return null;
  const completed = trip.stops.filter((stop) => ['Delivered', 'Partially delivered', 'Failed', 'Changed by dispatcher'].includes(getStopRecord(trip.id, stop.sequence).status)).length;
  const progress = completed / trip.stops.length * 100;
  const selectedMatch = location.pathname.match(/\/stops\/(\d+)/);
  const selectedSequence = selectedMatch ? Number(selectedMatch[1]) : undefined;

  return (
    <div className="space-y-5">
      <PageIntro meta={`${trip.brand} · ${trip.district}`} title={`Trip ${trip.number} route`} description="Stops are ordered by Dispatch and cannot be changed here." />
      <section className="rounded-panel bg-forest p-4 text-white shadow-card" aria-label="Trip progress">
        <div className="flex items-center justify-between gap-3"><p className="font-semibold">Trip progress</p><p className="whitespace-nowrap text-sm font-bold text-brand-pale">{completed} of {trip.stops.length} resolved</p></div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/20"><div className="h-full rounded-full bg-brand-mint" style={{ width: `${progress}%` }} /></div>
      </section>
      {connection === 'offline' && <Card className="border border-amber/40 p-4 xl:hidden"><p className="font-semibold text-ink">Waiting to sync</p><p className="mt-2 text-sm text-subtle">{queue.total} actions awaiting synchronization</p><p className="mt-1 text-xs text-subtle">Last synced {lastSyncedAt}</p></Card>}
      <StopTimeline trip={trip} selectedSequence={selectedSequence} />
      {connection === 'online' && !conflictPending && isTripResolved(trip.id) &&
      <Button size="lg" fullWidth onClick={() => navigate(`/trips/${trip.id}/complete`)}>View trip summary<ArrowRightIcon aria-hidden className="h-5 w-5" /></Button>
      }
    </div>);

}