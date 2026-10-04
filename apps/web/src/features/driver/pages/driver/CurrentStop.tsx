import { ArrowRightIcon, CheckCircle2Icon, Clock3Icon, MapPinnedIcon, PackageIcon, SnowflakeIcon } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import { PageIntro } from '../../components/driver/PageIntro';
import { useDriver } from '../../contexts/DriverContext';

export function CurrentStop() {
  const { trips: TRIPS, departedTrips, getNextStopSequence } = useDriver();
  const activeTrip = TRIPS.find((trip) => departedTrips[trip.id] && getNextStopSequence(trip.id) !== null);

  if (activeTrip) {
    return <Navigate to={`/trips/${activeTrip.id}/stops/${getNextStopSequence(activeTrip.id)}`} replace />;
  }

  const upcomingTrip = TRIPS.find((trip) => !departedTrips[trip.id]);

  if (!upcomingTrip) {
    return (
      <div className="mx-auto max-w-md py-14 text-center">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-brand-pale text-forest"><CheckCircle2Icon aria-hidden className="h-8 w-8" /></span>
        <h1 className="mt-5 text-2xl font-bold text-ink">No stops left today</h1>
        <p className="mt-2 text-sm leading-6 text-subtle">Every assigned stop has been resolved. Review your trips or end the day.</p>
        <Link to="/" className="mt-8 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-forest px-5 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">Back to today</Link>
      </div>);

  }

  const firstStop = upcomingTrip.stops[0];
  const totalCases = upcomingTrip.stops.reduce((sum, stop) => sum + stop.cases, 0);

  return (
    <div className="max-w-3xl space-y-5 md:space-y-6">
      <div className="xl:hidden"><PageIntro title="Current stop" description="Your first stop appears here once the trip has departed." /></div>

      <section className="rounded-panel bg-forest p-5 text-white shadow-card md:p-6" aria-labelledby="not-started-heading">
        <p className="text-xs font-semibold text-brand-pale">Trip {upcomingTrip.number} · {upcomingTrip.brand}</p>
        <h2 id="not-started-heading" className="mt-2 text-2xl font-semibold tracking-tight">Trip not started yet</h2>
        <p className="mt-2 text-sm leading-6 text-brand-pale">Complete the pre-departure check and depart to begin navigating your stops.</p>
        <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-brand-pale">
          <span className="inline-flex items-center gap-1.5"><Clock3Icon aria-hidden className="h-4 w-4" />Departs {upcomingTrip.departure}</span>
          <span className="inline-flex items-center gap-1.5"><MapPinnedIcon aria-hidden className="h-4 w-4" />{upcomingTrip.stops.length} stops</span>
          <span className="inline-flex items-center gap-1.5"><PackageIcon aria-hidden className="h-4 w-4" />{totalCases} cases</span>
        </div>
      </section>

      <section className="rounded-panel bg-brand-pale p-5 text-forest shadow-card" aria-labelledby="first-stop-heading">
        <p className="text-xs font-semibold opacity-70">First stop · {firstStop.outletId}</p>
        <h2 id="first-stop-heading" className="mt-1 text-xl font-semibold">{firstStop.name}</h2>
        <p className="mt-1 text-sm opacity-75">{firstStop.address}</p>
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-brand/20 pt-4 text-sm">
          <span>Window <span className="font-semibold">{firstStop.window}</span></span>
          {firstStop.eta && <span>ETA <span className="font-semibold">{firstStop.eta}</span></span>}
          {firstStop.chilledCases > 0 && <span className="inline-flex items-center gap-1 font-semibold text-blue-ink"><SnowflakeIcon aria-hidden className="h-4 w-4" />{firstStop.chilledCases} chilled</span>}
        </div>
      </section>

      <Link to={`/trips/${upcomingTrip.id}/check`} className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-forest px-6 text-base font-semibold text-white transition-colors duration-150 hover:bg-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand md:w-auto">
        Start Trip {upcomingTrip.number} check<ArrowRightIcon aria-hidden className="h-5 w-5" />
      </Link>
    </div>);

}