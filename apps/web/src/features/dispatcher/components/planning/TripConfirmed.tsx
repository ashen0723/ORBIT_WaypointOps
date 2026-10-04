import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRightIcon, CircleCheckIcon } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import type { Trip } from '../../types/dispatch';
import { formatDate } from '../../utils/clock';
import { plural, tripLabel } from '../../utils/format';
import { to12h } from '../../utils/time';

interface TripConfirmedProps {
  trip: Trip;
  driverName: string;
  onContinue: () => void;
  onPlanAnother: () => void;
}

export function TripConfirmed({ trip, driverName, onContinue, onPlanAnother }: TripConfirmedProps) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}>
      <Card className="mx-auto max-w-xl p-8 text-center md:p-10">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-brand-pale text-forest">
          <CircleCheckIcon aria-hidden="true" className="h-8 w-8" />
        </span>
        <h2 className="mt-5 text-2xl font-semibold tracking-tight text-ink md:text-[28px]">{tripLabel(trip.number)} confirmed</h2>
        <p className="mt-2 text-subtle">
          {trip.vehicleId} · {driverName} · {plural(trip.stops.length, 'stop')} · departs {to12h(trip.departAt)} on {formatDate(trip.date)}. The loader, driver and each store can see it now.
        </p>
        <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button size="lg" onClick={onContinue}>
            View Loading
            <ArrowRightIcon aria-hidden="true" className="h-5 w-5" />
          </Button>
          <Button size="lg" variant="secondary" onClick={onPlanAnother}>
            Plan Another Trip
          </Button>
        </div>
      </Card>
    </motion.div>);

}