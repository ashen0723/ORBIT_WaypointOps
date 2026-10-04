import { Clock3Icon, PackagePlusIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CurvedLines } from '../ui/CurvedLines';
import { useCutoffSeconds } from '../../contexts/CutoffContext';
import { CUTOFF_LABEL } from '../../data/schedule';
import { pad2, splitCountdown } from '../../utils/time';
import { buttonStyles } from '../ui/Button';

export function ReceivingTimer() {
  const seconds = useCutoffSeconds();
  const { h, m, s } = splitCountdown(seconds);
  const past = seconds === 0;
  const urgent = seconds > 0 && seconds < 3600;

  return (
    <section aria-labelledby="timer-heading" className="relative flex h-full min-h-[220px] flex-col overflow-hidden rounded-card bg-gradient-to-r from-forest to-brand p-4 text-white shadow-card md:p-6">
      <CurvedLines className="text-white/10" />
      <div className="relative flex items-center justify-between gap-3">
        <h2 id="timer-heading" className="text-lg font-semibold">
          Order Cutoff
        </h2>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${urgent || past ? 'bg-amber text-amber-ink' : 'bg-white/15 text-white'}`}>
          <Clock3Icon aria-hidden="true" className="h-3.5 w-3.5" />
          {past ? 'Closed' : `Today · ${CUTOFF_LABEL}`}
        </span>
      </div>
      <p className="relative mt-1 text-sm text-white/75">
        {past ? 'Today’s order window has closed.' : 'Time left to submit today’s Fresh order'}
      </p>
      <p role="timer" aria-label={past ? 'Order cutoff has passed' : `${h} hours, ${m} minutes, and ${s} seconds until the 4 PM cutoff`} className="relative mt-5 text-center text-[40px] font-semibold leading-none tabular-nums">
        {pad2(h)}:{pad2(m)}:{pad2(s)}
      </p>
      <div className="relative mt-auto pt-6">
        {past ?
        <Link to="/history" className={buttonStyles('secondary', 'md', true)}>
            View orders
          </Link> :

        <Link to="/place-order" className={buttonStyles('secondary', 'md', true)}>
            <PackagePlusIcon aria-hidden="true" className="h-4 w-4" />
            Place order
          </Link>
        }
      </div>
    </section>);

}