import React from 'react';

interface DeliveryProgressGaugeProps {
  completed: number;
  total: number;
}

export function DeliveryProgressGauge({ completed, total }: DeliveryProgressGaugeProps) {
  const percentage = total ? Math.round(completed / total * 100) : 0;
  const circumference = 251.2;
  const progress = percentage / 100 * circumference;
  return (
    <section className="rounded-panel bg-brand-pale/60 p-5 shadow-card" aria-labelledby="progress-heading">
      <h2 id="progress-heading" className="text-lg font-semibold text-forest">Delivery progress</h2>
      <div className="relative mx-auto mt-4 h-44 w-56" role="img" aria-label={`${percentage}% of stops resolved`}>
        <svg viewBox="0 0 200 130" className="h-full w-full" aria-hidden>
          <path d="M 25 110 A 75 75 0 0 1 175 110" fill="none" stroke="#E0E3E0" strokeWidth="24" strokeLinecap="round" />
          <path d="M 25 110 A 75 75 0 0 1 175 110" fill="none" stroke="#1B6B3F" strokeWidth="24" strokeLinecap="round" pathLength="251.2" strokeDasharray={`${progress} ${circumference}`} />
        </svg>
        <div className="absolute inset-x-0 bottom-3 text-center"><p className="text-4xl font-semibold tracking-tight text-ink">{percentage}%</p><p className="mt-1 text-xs text-subtle">Route resolved</p></div>
      </div>
      <div className="flex items-center justify-center gap-5 text-xs text-subtle"><span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-brand" />Completed</span><span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-line" />Remaining</span></div>
    </section>);

}