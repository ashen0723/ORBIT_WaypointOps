import React from 'react';
import { AlertTriangleIcon, CheckIcon, SnowflakeIcon } from 'lucide-react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { PageIntro } from '../../components/driver/PageIntro';
import { StateBanner } from '../../components/driver/StateBanner';
import { Button } from '../../components/ui/Button';
import { useDriver } from '../../contexts/DriverContext';
import { TRIPS } from '../../data/driver';

export function TripCheck() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const { loaderFlagsAcknowledged, acknowledgeLoaderFlags, departTrip } = useDriver();
  const trip = TRIPS.find((candidate) => candidate.id === tripId);
  if (!trip) return <Navigate to="/" replace />;
  const totalCases = trip.stops.reduce((sum, stop) => sum + stop.cases, 0);
  const chilledCases = trip.stops.reduce((sum, stop) => sum + stop.chilledCases, 0);
  const acknowledged = Boolean(loaderFlagsAcknowledged[trip.id]);

  const depart = () => {
    departTrip(trip.id);
    navigate(`/trips/${trip.id}/stops`);
  };

  return (
    <div className="space-y-5 md:space-y-6">
      <PageIntro meta={`Trip ${trip.number} · departs ${trip.departure}`} title="Pre-departure check" description={`${trip.brand} · ${trip.district}`} titleInDesktopHeader />
      <div className="space-y-5 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(320px,400px)] lg:items-start lg:gap-6 lg:space-y-0">
        <div className="space-y-5">
          <section className="grid grid-cols-3 divide-x divide-brand/20 rounded-panel bg-brand-pale p-4 text-center shadow-card" aria-label="Trip totals">
            <div><p className="text-xl font-bold text-forest">{trip.stops.length}</p><p className="mt-1 text-xs text-forest/70">Stops</p></div>
            <div><p className="text-xl font-bold text-forest">{totalCases}</p><p className="mt-1 text-xs text-forest/70">Cases</p></div>
            <div><p className="text-xl font-bold text-blue-ink">{chilledCases}</p><p className="mt-1 text-xs text-forest/70">Chilled</p></div>
          </section>
          {trip.loaderFlag && <div className="lg:hidden"><StateBanner tone="danger" title="Loader flag" detail={trip.loaderFlag} /></div>}
          <section aria-labelledby="load-order-heading">
            <h2 id="load-order-heading" className="text-lg font-bold text-ink">Loaded in delivery order</h2>
            <div className="mt-3 overflow-hidden rounded-card bg-surface shadow-card">
              {trip.stops.map((stop) =>
              <div key={stop.outletId} className="flex items-center gap-3 border-b border-line p-4 last:border-0">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-canvas text-sm font-bold text-ink">{stop.sequence}</span>
                  <div className="min-w-0 flex-1"><p className="font-semibold text-ink">{stop.outletId} · {stop.cases} cases</p><p className="mt-1 text-xs text-subtle">{stop.name}</p></div>
                  {stop.chilledCases > 0 && <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-ink"><SnowflakeIcon aria-hidden className="h-4 w-4" />{stop.chilledCases}</span>}
                </div>
              )}
            </div>
          </section>
        </div>
        <div className="space-y-5 lg:sticky lg:top-8">
          {trip.loaderFlag && <div className="hidden lg:block"><StateBanner tone="danger" title="Loader flag" detail={trip.loaderFlag} /></div>}
          <label className="flex min-h-16 cursor-pointer items-center gap-3 rounded-card border border-amber/40 bg-amber-pale p-4 shadow-card">
            <input type="checkbox" checked={acknowledged} onChange={(event) => acknowledgeLoaderFlags(trip.id, event.target.checked)} className="h-6 w-6 rounded border-line text-brand focus:ring-brand" />
            <span className="font-semibold text-amber-ink">I've seen the loader flags</span>
          </label>
          <div className="rounded-card bg-brand-pale p-4 text-sm leading-5 text-forest"><CheckIcon aria-hidden className="mr-2 inline h-4 w-4" />Dispatcher and stores on this trip will be notified when you depart.</div>
          <Button size="lg" fullWidth disabled={Boolean(trip.loaderFlag) && !acknowledged} onClick={depart}><AlertTriangleIcon aria-hidden className="h-5 w-5" />Depart — start trip</Button>
        </div>
      </div>
    </div>);

}