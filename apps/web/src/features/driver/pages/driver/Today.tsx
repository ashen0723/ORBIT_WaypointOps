import { useDriver } from '../../contexts/DriverContext';
import { MapPinIcon, SnowflakeIcon, TruckIcon } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { PageIntro } from '../../components/driver/PageIntro';
import { StateBanner } from '../../components/driver/StateBanner';
import { TripCard } from '../../components/driver/TripCard';

export function Today() {
  const { identity: DRIVER, trips: TRIPS } = useDriver();
  const allStops = TRIPS.flatMap((trip) => trip.stops);
  const summary = [
  { label: 'Total stops', value: allStops.length },
  { label: 'Total cases', value: allStops.reduce((sum, stop) => sum + stop.cases, 0) },
  { label: 'Chilled cases', value: allStops.reduce((sum, stop) => sum + stop.chilledCases, 0), chilled: true },
  { label: 'Loader flags', value: TRIPS.filter((trip) => trip.loaderFlag).length, alert: true }];


  return (
    <div className="space-y-5 md:space-y-6">
      <div className="xl:hidden"><PageIntro meta={DRIVER.date} title={`Good morning, ${DRIVER.name.split(' ')[0]}`} description="Review released trips and complete the vehicle and load check before departure." /></div>
      <StateBanner tone="success" title="Available route preview" detail="Check the sync panel for actual save status." />

      <Card className="hidden grid-cols-4 divide-x divide-line py-4 xl:grid" role="group" aria-label="Today's totals">
        {summary.map((item) =>
        <div key={item.label} className="px-6">
            <p className={`flex items-center gap-2 text-2xl font-bold tabular-nums ${item.alert && item.value > 0 ? 'text-danger-ink' : item.chilled ? 'text-blue-ink' : 'text-ink'}`}>
              {item.value}
              {item.chilled && <SnowflakeIcon aria-hidden className="h-5 w-5" />}
            </p>
            <p className="mt-1 text-sm text-subtle">{item.label}</p>
          </div>
        )}
      </Card>

      <section aria-labelledby="trips-heading" className="grid gap-3 md:grid-cols-2 md:gap-4 xl:grid-cols-3">
        <article className="h-full rounded-card bg-forest p-4 text-white shadow-card">
          <p className="text-xs font-semibold text-brand-pale">Today's vehicle</p>
          <div className="mt-3 flex items-start gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white/10 text-white ring-1 ring-inset ring-white/25"><TruckIcon aria-hidden className="h-6 w-6" /></span>
            <div className="min-w-0 flex-1"><h2 className="text-lg font-bold text-white">{DRIVER.vehicle}</h2><p className="mt-1 flex items-center gap-1.5 text-sm text-brand-pale"><SnowflakeIcon aria-hidden className="h-4 w-4" />{DRIVER.vehicleType}</p><p className="mt-1 flex items-center gap-1.5 text-sm text-brand-pale"><MapPinIcon aria-hidden className="h-4 w-4" />{DRIVER.depot}</p></div>
          </div>
        </article>
        <div className="flex items-end justify-between gap-3 pt-2 md:order-first md:col-span-full md:pt-0">
          <h2 id="trips-heading" className="text-lg font-bold text-ink">Today's trips</h2>
          <span className="text-sm font-semibold text-subtle">2 trips</span>
        </div>
        {TRIPS.length === 0 && <p role="status">No assigned released trips are available.</p>}
        {TRIPS.map((trip) => <TripCard key={trip.id} trip={trip} />)}
      </section>
      <p className="pb-2 text-center text-xs leading-5 text-subtle">Use the app only when safely stopped.</p>
    </div>);

}