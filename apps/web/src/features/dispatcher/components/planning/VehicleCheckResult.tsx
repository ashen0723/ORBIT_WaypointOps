import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRightIcon, CircleCheckIcon, CircleXIcon } from 'lucide-react';
import { Button } from '../ui/Button';
import { TripFeasibilityPanel } from './TripFeasibilityPanel';
import type { TripValidation } from '../../utils/tripValidation';

interface VehicleCheckResultProps {
  result: TripValidation;
  onChooseAnother: () => void;
  onEditTrip: () => void;
  onReview: () => void;
}

export function VehicleCheckResult({ result, onChooseAnother, onEditTrip, onReview }: VehicleCheckResultProps) {
  const { issues } = result;
  return (
    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }} className="mt-4 space-y-2">
      {issues.length > 0 ?
      <div role="alert" className="space-y-2">
          {issues.map((issue) =>
        <div key={issue.key} className="flex gap-3 rounded-2xl bg-danger-pale p-4">
              <CircleXIcon aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-danger-ink" />
              <div>
                <p className="font-semibold text-danger-ink">{issue.title}</p>
                <p className="mt-0.5 text-sm text-ink">{issue.message}</p>
                <p className="mt-1 text-sm font-semibold text-ink">{issue.fix}</p>
              </div>
            </div>
        )}
          <TripFeasibilityPanel feasibility={result.feasibility} />
          <div className="flex flex-col gap-2 pt-1 sm:flex-row">
            <Button variant="secondary" size="lg" onClick={onEditTrip} className="w-full sm:w-auto">
              Edit Trip
            </Button>
            <Button variant="secondary" size="lg" onClick={onChooseAnother} className="w-full sm:w-auto">
              Choose Another Vehicle
            </Button>
            <Button variant="ghost" size="lg" onClick={onReview} className="w-full sm:w-auto">
              Adjust time or driver
            </Button>
          </div>
        </div> :

      <>
          <TripFeasibilityPanel feasibility={result.feasibility} />
          <div className="flex flex-col gap-4 rounded-2xl bg-brand-pale p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-3">
              <CircleCheckIcon aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-forest" />
              <div>
                <p className="font-semibold text-forest">All 10 checks pass</p>
                <p className="mt-0.5 text-sm text-ink">Capacity, storage, access, windows, Fresh deadline, schedule, time and fuel are OK.</p>
              </div>
            </div>
            <Button size="lg" onClick={onReview} className="w-full shrink-0 sm:w-auto">
              Review Trip
              <ArrowRightIcon aria-hidden="true" className="h-5 w-5" />
            </Button>
          </div>
        </>
      }
    </motion.div>);

}