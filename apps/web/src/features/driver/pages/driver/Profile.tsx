import { ChevronRightIcon, MapPinIcon, ShieldCheckIcon, SmartphoneIcon, SnowflakeIcon, TruckIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ConnectionPill } from '../../components/driver/ConnectionPill';
import { PageIntro } from '../../components/driver/PageIntro';
import { Card } from '../../components/ui/Card';
import { useDriver } from '../../contexts/DriverContext';

export function Profile() {
  const { identity: DRIVER, connection, lastSyncedAt } = useDriver();
  const initials = DRIVER.name.split(' ').map((part) => part[0]).join('').slice(0, 2);
  return (
    <div className="max-w-5xl space-y-5 md:space-y-6">
      <div className="xl:hidden"><PageIntro title="Profile" description="Driver, vehicle, and offline readiness for today's work." titleInDesktopHeader /></div>
      <Card className="overflow-hidden rounded-panel">
        <div className="bg-forest p-6 text-white md:p-8">
          <div className="flex flex-wrap items-center gap-5"><span className="grid h-20 w-20 shrink-0 place-items-center rounded-full bg-brand-pale text-2xl font-bold text-forest ring-4 ring-white/20">{initials}</span><div className="min-w-0 flex-1"><h2 className="text-2xl font-semibold tracking-tight">{DRIVER.name}</h2><p className="mt-1 text-sm text-brand-pale">Waypoint Group Driver · Kandy fleet</p><div className="mt-4"><ConnectionPill connection={connection} /></div></div><div className="text-left md:text-right"><p className="text-xs text-brand-pale">Last synced</p><p className="mt-1 font-semibold">{lastSyncedAt}</p></div></div>
        </div>
        <div className="grid divide-y divide-line md:grid-cols-3 md:divide-x md:divide-y-0">
          <div className="flex items-center gap-3 p-5"><TruckIcon aria-hidden className="h-5 w-5 text-forest" /><div><p className="text-xs text-subtle">Assigned vehicle</p><p className="mt-1 text-sm font-semibold text-ink">{DRIVER.vehicle}</p></div></div>
          <div className="flex items-center gap-3 p-5"><SnowflakeIcon aria-hidden className="h-5 w-5 text-blue-ink" /><div><p className="text-xs text-subtle">Vehicle type</p><p className="mt-1 text-sm font-semibold text-ink">{DRIVER.vehicleType}</p></div></div>
          <div className="flex items-center gap-3 p-5"><MapPinIcon aria-hidden className="h-5 w-5 text-forest" /><div><p className="text-xs text-subtle">Home depot</p><p className="mt-1 text-sm font-semibold text-ink">{DRIVER.depot}</p></div></div>
        </div>
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-panel bg-brand-pale p-5 text-forest shadow-card"><div className="flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-surface shadow-card"><ShieldCheckIcon aria-hidden className="h-5 w-5" /></span><div><h2 className="font-semibold">Offline readiness</h2><p className="mt-2 text-sm leading-6 opacity-75">Available route data remains visible when signal drops. Durable storage requires the queue integration.</p><p className="mt-3 text-xs font-semibold">Check the synchronization panel for save status.</p></div></div></section>
        <Link to="/safe-use" className="flex min-h-40 items-center gap-4 rounded-panel bg-amber-pale p-5 text-amber-ink shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-surface shadow-card"><SmartphoneIcon aria-hidden className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="block font-semibold">Preview safe-use mode</span><span className="mt-2 block text-sm leading-6 opacity-75">See the simplified screen shown while the vehicle is moving.</span></span><ChevronRightIcon aria-hidden className="h-5 w-5" /></Link>
      </div>
      <p className="text-center text-xs leading-5 text-subtle">Signed in through Waypoint shared login.</p>
    </div>);

}