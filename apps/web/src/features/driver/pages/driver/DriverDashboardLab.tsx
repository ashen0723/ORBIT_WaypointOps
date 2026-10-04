import { BellIcon, SearchIcon, SnowflakeIcon, TriangleAlertIcon } from 'lucide-react';
import { DashboardMetricCard } from '../../components/driver-dashboard/DashboardMetricCard';
import { DashboardStopQueue } from '../../components/driver-dashboard/DashboardStopQueue';
import { DeliveryProgressGauge } from '../../components/driver-dashboard/DeliveryProgressGauge';
import { DeliveryVolumeChart } from '../../components/driver-dashboard/DeliveryVolumeChart';
import { DriverActivityList } from '../../components/driver-dashboard/DriverActivityList';
import { DriverSessionCard } from '../../components/driver-dashboard/DriverSessionCard';
import { NextStopReminder } from '../../components/driver-dashboard/NextStopReminder';
import { DriverProfileSummary } from '../../components/driver/DriverProfileSummary';
import { PageIntro } from '../../components/driver/PageIntro';
import { StateBanner } from '../../components/driver/StateBanner';
import { useDriver } from '../../contexts/DriverContext';

export function DriverDashboardLab() {
  const { identity: DRIVER, trips: TRIPS, connection, getStopRecord } = useDriver();
  const stops = TRIPS.flatMap((trip) => trip.stops.map((stop) => ({ tripId: trip.id, stop })));
  const records = stops.map(({ tripId, stop }) => getStopRecord(tripId, stop.sequence));
  const resolved = records.filter((record) => ['Delivered', 'Partially delivered', 'Failed', 'Changed by dispatcher'].includes(record.status)).length;
  const totalCases = stops.reduce((sum, entry) => sum + entry.stop.cases, 0);
  const chilledCases = stops.reduce((sum, entry) => sum + entry.stop.chilledCases, 0);
  const attention = records.filter((record) => record.status === 'Failed' || record.syncState === 'Needs attention').length + TRIPS.filter((trip) => trip.loaderFlag).length;

  return (
    <div className="space-y-5 md:space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4 xl:hidden">
        <PageIntro title="Dashboard Lab" description="Plan the day, follow delivery progress, and keep records ready to sync." titleInDesktopHeader />
        <div className="hidden items-center gap-2 lg:flex">
          <label className="relative block"><span className="sr-only">Search driver records</span><SearchIcon aria-hidden className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" /><input type="search" placeholder="Search records" className="h-12 w-56 rounded-full border border-line bg-surface pl-11 pr-4 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20" /></label>
          <button type="button" aria-label="Notifications" className="grid h-12 w-12 place-items-center rounded-full bg-surface text-ink shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"><BellIcon aria-hidden className="h-5 w-5" /></button>
          <DriverProfileSummary />
        </div>
      </div>

      {connection === 'offline' && <StateBanner tone="warning" title="Dashboard is available offline" detail="Live actions and records are saved on this device until the connection returns." />}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Daily overview">
        <DashboardMetricCard tone="forest" label="Today's stops" value={stops.length} detail={`${resolved} resolved across 2 trips`} />
        <DashboardMetricCard tone="surface" label="Total cases" value={totalCases} detail="Fresh cases and Style cartons" />
        <DashboardMetricCard tone="mint" label="Chilled cases" value={chilledCases} detail="Reefer vehicle required" />
        <DashboardMetricCard tone="amber" label="Needs attention" value={attention} detail={attention ? 'Loader flags and delivery issues' : 'No active exceptions'} />
      </section>

      <div className="grid gap-4 xl:grid-cols-12">
        <div className="xl:col-span-6"><DeliveryVolumeChart /></div>
        <div className="xl:col-span-3"><NextStopReminder /></div>
        <div className="xl:col-span-3"><DashboardStopQueue /></div>
        <div className="xl:col-span-5"><DriverActivityList /></div>
        <div className="xl:col-span-4"><DeliveryProgressGauge completed={resolved} total={stops.length} /></div>
        <div className="xl:col-span-3"><DriverSessionCard /></div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-panel bg-brand-pale p-5 text-forest">
        <div className="flex items-start gap-3"><SnowflakeIcon aria-hidden className="mt-0.5 h-5 w-5 shrink-0" /><div><p className="font-semibold">{DRIVER.vehicle} refrigeration ready</p><p className="mt-1 text-sm">{chilledCases} chilled cases are scheduled today from {DRIVER.depot}.</p></div></div>
        {attention > 0 && <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-2 text-xs font-semibold text-danger-ink"><TriangleAlertIcon aria-hidden className="h-4 w-4" />{attention} item needs review</span>}
      </div>
    </div>);

}