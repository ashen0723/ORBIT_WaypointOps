import React from 'react';
import type { LoaderQueueStatus } from '../../types/loader';
const STATUS_STYLES: Record<LoaderQueueStatus, {
  label: string;
  className: string;
  dotClassName: string;
}> = {
  ready: { label: 'Ready to Load', className: 'bg-brand-pale text-forest ring-1 ring-inset ring-brand/30', dotClassName: 'bg-brand' },
  in_progress: { label: 'In Progress', className: 'bg-brand-pale/70 text-forest ring-1 ring-inset ring-brand/25', dotClassName: 'bg-brand-medium' },
  waiting: { label: 'Waiting', className: 'bg-canvas text-subtle ring-1 ring-inset ring-line', dotClassName: 'bg-hatch' },
  plan_updated: { label: 'Plan Updated', className: 'bg-amber-pale text-amber-ink ring-1 ring-inset ring-amber/40', dotClassName: 'bg-amber' },
  completed: { label: 'Completed', className: 'bg-forest text-white', dotClassName: 'bg-white/80' }
};
export function LoaderStatusChip({
  status


}: {status: LoaderQueueStatus;}) {
  const config = STATUS_STYLES[status];
  return <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold ${config.className}`}><span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${config.dotClassName}`} />{config.label}</span>;
}