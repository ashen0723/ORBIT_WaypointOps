import React from 'react';
import { ArrowRightIcon, CheckCircle2Icon } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { useDriver } from '../../contexts/DriverContext';
import { StopDetail } from './StopDetail';

export function NextStopPanel() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const { getNextStopSequence, conflictPending } = useDriver();
  const next = tripId ? getNextStopSequence(tripId) : null;

  if (next !== null) return <StopDetail sequenceOverride={next} />;

  return (
    <div className="py-10 text-center">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-brand-pale text-forest"><CheckCircle2Icon aria-hidden className="h-7 w-7" /></span>
      <h2 className="mt-4 text-xl font-bold text-ink">All stops resolved</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-subtle">Every stop on this trip has an outcome recorded or was changed by the Dispatcher.</p>
      {!conflictPending &&
      <Button size="lg" className="mt-6" onClick={() => navigate(`/trips/${tripId}/complete`)}>View trip summary<ArrowRightIcon aria-hidden className="h-5 w-5" /></Button>
      }
    </div>);

}