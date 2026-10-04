import React from 'react';
import { ArrowRightIcon, MapPinnedIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDriver } from '../../contexts/DriverContext';
import { TRIP_ONE } from '../../data/driver';

export function NextStopReminder() {
  const { getNextStopSequence } = useDriver();
  const sequence = getNextStopSequence(TRIP_ONE.id) ?? TRIP_ONE.stops.length;
  const stop = TRIP_ONE.stops.find((candidate) => candidate.sequence === sequence) ?? TRIP_ONE.stops[TRIP_ONE.stops.length - 1];
  return (
    <section className="flex min-h-64 flex-col rounded-panel bg-brand-pale p-5 text-forest shadow-card" aria-labelledby="next-stop-heading">
      <div className="flex items-start justify-between gap-3"><div><h2 id="next-stop-heading" className="text-lg font-semibold">Next stop</h2><p className="mt-1 text-sm opacity-75">Trip 1 · Stop {stop.sequence}</p></div><span className="grid h-10 w-10 place-items-center rounded-full bg-surface text-forest shadow-card"><MapPinnedIcon aria-hidden className="h-5 w-5" /></span></div>
      <p className="mt-6 text-xl font-semibold leading-7">{stop.name}</p>
      <p className="mt-1 text-sm opacity-75">{stop.outletId}</p>
      <div className="mt-4 border-y border-brand/20 py-3 text-sm"><div className="flex justify-between gap-3"><span className="opacity-70">ETA</span><span className="font-semibold">{stop.eta}</span></div><div className="mt-2 flex justify-between gap-3"><span className="opacity-70">Window</span><span className="font-semibold">{stop.window}</span></div></div>
      <Link to={`/trips/${TRIP_ONE.id}/stops/${stop.sequence}`} className="mt-auto inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-brand px-5 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2">Open stop<ArrowRightIcon aria-hidden className="h-4 w-4" /></Link>
    </section>);

}