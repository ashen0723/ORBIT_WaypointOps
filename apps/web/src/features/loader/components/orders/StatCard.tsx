import React from 'react';
type Tone = 'surface' | 'forest' | 'pale' | 'mint' | 'soft';
interface StatCardProps {
  label: string;
  value: number;
  highlight?: boolean;
  tone?: Tone;
}
const TONE_STYLES: Record<Tone, string> = {
  surface: 'bg-surface text-ink',
  forest: 'bg-gradient-to-r from-forest to-brand text-white',
  pale: 'bg-brand-pale text-forest',
  mint: 'bg-brand-mint/30 text-forest',
  soft: 'bg-brand-pale/60 text-forest'
};
export function StatCard({
  label,
  value,
  highlight = false,
  tone
}: StatCardProps) {
  const resolvedTone: Tone = tone ?? (highlight ? 'forest' : 'surface');
  return <div className={`flex min-h-[132px] flex-col justify-between rounded-card p-4 shadow-card lg:min-h-[156px] lg:p-6 ${TONE_STYLES[resolvedTone]}`}>
      <p className="text-sm font-medium lg:text-base">{label}</p>
      <p className="mt-5 text-[32px] font-semibold leading-none tabular-nums lg:text-5xl">{value}</p>
    </div>;
}