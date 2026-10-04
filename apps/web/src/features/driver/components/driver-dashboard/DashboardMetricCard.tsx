import { ArrowUpRightIcon } from 'lucide-react';

type Tone = 'forest' | 'surface' | 'mint' | 'amber';

interface DashboardMetricCardProps {
  label: string;
  value: string | number;
  detail: string;
  tone?: Tone;
}

const TONES: Record<Tone, string> = {
  forest: 'bg-brand text-white',
  surface: 'bg-surface text-ink',
  mint: 'bg-brand-pale text-forest',
  amber: 'bg-amber-pale text-amber-ink'
};

export function DashboardMetricCard({ label, value, detail, tone = 'surface' }: DashboardMetricCardProps) {
  const dark = tone === 'forest';
  return (
    <article className={`flex min-h-36 flex-col rounded-panel p-5 shadow-card ${TONES[tone]}`}>
      <div className="flex items-start justify-between gap-3">
        <h2 className={`text-sm font-semibold ${dark ? 'text-white' : ''}`}>{label}</h2>
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full border ${dark ? 'border-white/35 bg-white text-forest' : 'border-current/15 bg-surface/70'}`}><ArrowUpRightIcon aria-hidden className="h-5 w-5" /></span>
      </div>
      <p className="mt-3 text-4xl font-semibold tracking-tight tabular-nums">{value}</p>
      <p className={`mt-auto pt-3 text-xs ${dark ? 'text-brand-pale' : 'opacity-75'}`}>{detail}</p>
    </article>);

}