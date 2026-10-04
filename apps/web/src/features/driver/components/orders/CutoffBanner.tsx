import { ClockIcon, OctagonAlertIcon, TriangleAlertIcon } from 'lucide-react';
import { pad2, splitCountdown } from '../../utils/time';
import { CUTOFF_LABEL } from '../../data/schedule';

export function CutoffBanner({ seconds }: {seconds: number;}) {
  const { h, m, s } = splitCountdown(seconds);
  const past = seconds === 0;
  const warn = !past && seconds < 3600;

  const tone = past ?
  'border-danger bg-danger-pale text-danger-ink' :
  warn ?
  'border-amber bg-amber-pale text-amber-ink' :
  'border-brand/30 bg-brand-pale text-forest';
  const Icon = past ? OctagonAlertIcon : warn ? TriangleAlertIcon : ClockIcon;

  return (
    <div role="status" className={`mt-6 flex flex-col gap-2 rounded-card border px-4 py-4 sm:flex-row sm:items-center sm:justify-between md:px-6 ${tone}`}>
      <p className="flex items-start gap-3 font-semibold">
        <Icon aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
        <span>
          {past ?
          <>Order cutoff passed: Today {CUTOFF_LABEL} — ordering is closed until 6:00 AM tomorrow.</> :

          <>
              Order cutoff: Today {CUTOFF_LABEL} — {h}h {m}m remaining
            </>
          }
        </span>
      </p>
      <span aria-hidden="true" className="pl-8 text-2xl font-semibold tabular-nums tracking-tight sm:pl-0">
        {pad2(h)}:{pad2(m)}:{pad2(s)}
      </span>
    </div>);

}