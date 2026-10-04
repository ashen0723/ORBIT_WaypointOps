import React from 'react';
import { Link } from 'react-router-dom';
import { PackagePlusIcon } from 'lucide-react';
import { Card } from '../ui/Card';
import { buttonStyles } from '../ui/Button';
import { useCutoffSeconds } from '../../contexts/CutoffContext';
import { CUTOFF_LABEL, NEXT_DELIVERY } from '../../data/schedule';
import { formatDate } from '../../utils/format';
import { splitCountdown } from '../../utils/time';

export function CutoffReminder() {
  const seconds = useCutoffSeconds();
  const { h, m } = splitCountdown(seconds);
  const past = seconds === 0;

  return (
    <Card className="flex h-full flex-col p-4 md:p-6">
      <h2 className="text-lg font-semibold text-ink">Reminders</h2>
      <p className="mt-4 text-2xl font-semibold leading-tight text-forest">Fresh order for {formatDate(NEXT_DELIVERY.Fresh.date)}</p>
      <p className={`mt-2 text-sm ${past ? 'font-medium text-danger-ink' : seconds < 3600 ? 'font-medium text-amber-ink' : 'text-subtle'}`}>
        Cutoff: {CUTOFF_LABEL} · {past ? 'closed for today' : `${h}h ${m}m left`}
      </p>
      <div className="mt-auto pt-6">
        {past ?
        <Link to="/history" className={buttonStyles('outline', 'lg', true)}>
            View orders
          </Link> :

        <Link to="/place-order" className={buttonStyles('primary', 'lg', true)}>
            <PackagePlusIcon aria-hidden="true" className="h-5 w-5" />
            Place Order
          </Link>
        }
      </div>
    </Card>);

}