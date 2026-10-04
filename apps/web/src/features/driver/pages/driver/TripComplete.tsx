import { useState } from 'react';
import { CheckCircle2Icon, Clock3Icon, PackageOpenIcon, RotateCcwIcon } from 'lucide-react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { PageIntro } from '../../components/driver/PageIntro';
import { Button } from '../../components/ui/Button';
import { useDriver } from '../../contexts/DriverContext';

export function TripComplete() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const { trips: TRIPS, getStopRecord, isTripResolved, departedTrips, identity } = useDriver();
  const [dayEnded, setDayEnded] = useState(false);
  const trip = TRIPS.find((candidate) => candidate.id === tripId);
  if (!trip) return <Navigate to="/" replace />;
  const counts = trip.stops.reduce((current, stop) => {
    const record = getStopRecord(trip.id, stop.sequence);
    if (record.status === 'Delivered') current.delivered += 1;
    if (record.status === 'Partially delivered') current.partial += 1;
    if (record.status === 'Failed') current.failed += 1;
    current.photos += record.photoCount;
    return current;
  }, { delivered: 0, partial: 0, failed: 0, photos: 0 });
  const nextTrip = TRIPS.find(candidate => candidate.id !== trip.id && !departedTrips[candidate.id]);
  if (!isTripResolved(trip.id)) return <Navigate to={`/trips/${trip.id}/stops`} replace />;

  if (dayEnded) {
    return <div className="mx-auto max-w-md py-14 text-center"><span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-brand-pale text-forest"><CheckCircle2Icon aria-hidden className="h-8 w-8" /></span><h1 className="mt-5 text-2xl font-bold text-ink">Day ended</h1><p className="mt-2 text-sm leading-6 text-subtle">Review the synchronization panel before leaving. Review your vehicle assignment and return instructions with the depot.</p><Button size="lg" fullWidth className="mt-8" onClick={() => navigate('/')}>Back to today</Button></div>;
  }

  return (
    <div className="max-w-5xl space-y-5 md:space-y-6">
      <PageIntro meta={`Trip ${trip.number} · ${trip.brand}`} title="Trip complete" description="All assigned stops are resolved. Review the summary before your next trip." titleInDesktopHeader />
      <div className="grid grid-cols-3 gap-3 md:gap-4 xl:grid-cols-4">
        <section className="col-span-3 rounded-panel bg-forest p-5 text-white shadow-card xl:col-span-1"><div className="flex items-center gap-3"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white/10 ring-1 ring-inset ring-white/25"><CheckCircle2Icon aria-hidden className="h-6 w-6" /></span><div><p className="font-bold">Route completed</p><p className="mt-1 flex items-center gap-1.5 whitespace-nowrap text-sm text-brand-pale"><Clock3Icon aria-hidden className="h-4 w-4" />All stops resolved</p></div></div></section>
        <section className="rounded-panel bg-brand-pale p-3 text-center text-forest shadow-card xl:p-5"><p className="text-2xl font-bold xl:text-3xl">{counts.delivered}</p><p className="mt-1 text-xs opacity-70 xl:text-sm">Delivered</p></section>
        <section className="rounded-panel bg-amber-pale p-3 text-center text-amber-ink shadow-card xl:p-5"><p className="text-2xl font-bold xl:text-3xl">{counts.partial}</p><p className="mt-1 text-xs opacity-70 xl:text-sm">Partial</p></section>
        <section className="rounded-panel bg-danger-pale p-3 text-center text-danger-ink shadow-card xl:p-5"><p className="text-2xl font-bold xl:text-3xl">{counts.failed}</p><p className="mt-1 text-xs opacity-70 xl:text-sm">Failed</p></section>
      </div>
      <div className="space-y-5 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
        <section className="h-full rounded-panel bg-amber-pale p-4 text-amber-ink shadow-card xl:p-5"><div className="flex items-start gap-3"><PackageOpenIcon aria-hidden className="mt-0.5 h-5 w-5 shrink-0" /><div><h2 className="font-bold">Return to {identity.depot || 'assigned depot'}</h2><p className="mt-2 text-sm leading-6 opacity-75">Confirm returned quantities with the depot.</p></div></div></section>
        <section className="h-full rounded-panel bg-brand-pale p-4 text-forest shadow-card xl:p-5"><div className="flex items-center justify-between gap-3"><div><p className="font-semibold">All delivery records</p><p className="mt-1 text-xs opacity-75">{counts.delivered + counts.partial + counts.failed} deliveries · {counts.photos} photos</p></div><span className="text-xs">See sync panel</span></div></section>
      </div>
      <div className="space-y-3 md:flex md:gap-3 md:space-y-0">
        {nextTrip && <Button size="lg" fullWidth className="md:w-auto md:px-8" onClick={() => navigate(`/trips/${nextTrip.id}/check`)}><RotateCcwIcon aria-hidden className="h-5 w-5" />Start Trip {nextTrip.number} check</Button>}
        <Button variant="secondary" size="lg" fullWidth className="md:w-auto md:px-8" onClick={() => setDayEnded(true)}>End day</Button>
      </div>
    </div>);

}