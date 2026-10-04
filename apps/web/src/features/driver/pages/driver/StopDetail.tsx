import React from 'react';
import { AlertTriangleIcon, Clock3Icon, MapIcon, PhoneIcon, SnowflakeIcon, StoreIcon } from 'lucide-react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { DriverStatusChip } from '../../components/driver/DriverStatusChip';
import { PageIntro } from '../../components/driver/PageIntro';
import { StateBanner } from '../../components/driver/StateBanner';
import { Button } from '../../components/ui/Button';
import { useDriver } from '../../contexts/DriverContext';
import { TRIPS } from '../../data/driver';
import { arrivalTime } from '../../utils/driverTime';

export function StopDetail({ sequenceOverride }: {sequenceOverride?: number;}) {
  const { tripId, sequence } = useParams();
  const navigate = useNavigate();
  const { getStopRecord, recordArrival } = useDriver();
  const trip = TRIPS.find((candidate) => candidate.id === tripId);
  const stopSequence = sequenceOverride ?? Number(sequence);
  const stop = trip?.stops.find((candidate) => candidate.sequence === stopSequence);
  if (!trip || !stop) return <Navigate to="/" replace />;
  const record = getStopRecord(trip.id, stop.sequence);
  const arrived = record.status === 'Arrived';
  const resolved = ['Delivered', 'Partially delivered', 'Failed', 'Changed by dispatcher'].includes(record.status);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3"><PageIntro meta={`Stop ${stop.sequence} of ${trip.stops.length} · ${stop.outletId}`} title={stop.name} description={stop.address} /><DriverStatusChip status={record.status} /></div>
      <div className="space-y-5 2xl:grid 2xl:grid-cols-2 2xl:gap-4 2xl:space-y-0">
        <section className="rounded-panel bg-brand-pale p-5 text-center text-forest shadow-card"><p className="text-sm font-semibold opacity-70">Delivery window</p><p className="mt-2 text-3xl font-bold tracking-tight">{stop.window}</p><p className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold"><Clock3Icon aria-hidden className="h-4 w-4" />ETA {stop.eta} · shared with store</p></section>
        <section className="rounded-panel bg-canvas p-4"><div className="flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-surface text-forest shadow-card"><StoreIcon aria-hidden className="h-5 w-5" /></span><div><p className="font-semibold capitalize text-ink">{stop.unloading}</p><p className="mt-1 text-sm leading-5 text-subtle">{stop.accessNote}</p>{stop.access === 'van_only' && <span className="mt-2 inline-flex rounded-full bg-surface px-3 py-1 text-xs font-semibold text-ink ring-1 ring-inset ring-line">Van only</span>}</div></div></section>
      </div>
      <a href={`tel:${stop.contactPhone}`} className="flex min-h-16 items-center gap-3 rounded-card bg-surface p-4 shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand md:border md:border-line md:shadow-none"><PhoneIcon aria-hidden className="h-5 w-5 text-forest" /><span className="min-w-0 flex-1"><span className="block font-semibold text-ink">{stop.contactName}</span><span className="mt-1 block text-xs text-subtle">Store contact · {stop.contactPhone}</span></span><span className="font-semibold text-forest">Call</span></a>
      {stop.sequence === 3 && trip.loaderFlag && <StateBanner tone="danger" title="Loader flag for this stop" detail="2 cases yoghurt missing from the load. Deliver the remaining planned items and record the shortage." />}
      <section aria-labelledby="handover-heading"><h2 id="handover-heading" className="text-lg font-bold text-ink">Items to hand over</h2><div className="mt-3 overflow-hidden rounded-card bg-surface shadow-card md:border md:border-line md:shadow-none">{stop.items.map((item) => <div key={item.id} className="flex items-center gap-3 border-b border-line p-4 last:border-0"><span className="min-w-0 flex-1 font-semibold text-ink">{item.name}</span>{item.chilled && <SnowflakeIcon aria-label="Chilled" className="h-5 w-5 text-blue-ink" />}<span className="font-bold text-ink">{item.planned}</span></div>)}</div></section>
      <Button variant="secondary" size="lg" fullWidth onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stop.address)}`, '_blank', 'noopener,noreferrer')}><MapIcon aria-hidden className="h-5 w-5" />Open in Google Maps</Button>
      {resolved ?
      <div className="space-y-3"><StateBanner tone={record.status === 'Changed by dispatcher' ? 'warning' : 'success'} title={record.status} detail={record.status === 'Changed by dispatcher' ? 'Do not deliver this stop. It is now assigned to VEH048.' : `Recorded ${record.completedAt ?? ''} · ${record.syncState ?? 'Synced'}`} /><Button variant="secondary" size="lg" fullWidth className="md:hidden" onClick={() => navigate(`/trips/${trip.id}/stops`)}>Back to route</Button></div> :
      !arrived ?
      <Button size="lg" fullWidth onClick={() => recordArrival(trip.id, stop.sequence, arrivalTime(trip.id, stop.sequence, stop.eta))}>I've arrived</Button> :

      <div className="space-y-3"><StateBanner tone="success" title={`Arrived ${record.arrivedAt}`} detail="Store Manager and Dispatcher notified" /><Button size="lg" fullWidth onClick={() => navigate(`/trips/${trip.id}/stops/${stop.sequence}/delivery`)}><AlertTriangleIcon aria-hidden className="h-5 w-5" />Record delivery</Button></div>
      }
    </div>);

}