import React from 'react';
import type { LoaderQueueStatus } from '../../types/loader';

interface StatusConfig {
  label: string;
  className: string;
  dotClassName: string;
}

const STATUS_STYLES: Record<LoaderQueueStatus, StatusConfig> = {
  ready: {
    label: 'Ready to Load',
    className:
      'bg-brand-pale text-forest ring-1 ring-inset ring-brand/30',
    dotClassName: 'bg-brand',
  },

  ready_to_load: {
    label: 'Ready to Load',
    className:
      'bg-brand-pale text-forest ring-1 ring-inset ring-brand/30',
    dotClassName: 'bg-brand',
  },

  in_progress: {
    label: 'Loading',
    className:
      'bg-brand-pale/70 text-forest ring-1 ring-inset ring-brand/25',
    dotClassName: 'bg-brand-medium',
  },

  loading: {
    label: 'Loading',
    className:
      'bg-brand-pale/70 text-forest ring-1 ring-inset ring-brand/25',
    dotClassName: 'bg-brand-medium',
  },

  waiting: {
    label: 'Awaiting Dispatcher',
    className:
      'bg-amber-pale text-amber-ink ring-1 ring-inset ring-amber/40',
    dotClassName: 'bg-amber',
  },

  awaiting_dispatcher: {
    label: 'Awaiting Dispatcher',
    className:
      'bg-amber-pale text-amber-ink ring-1 ring-inset ring-amber/40',
    dotClassName: 'bg-amber',
  },

  plan_updated: {
    label: 'Action Required',
    className:
      'bg-amber-pale text-amber-ink ring-1 ring-inset ring-amber/40',
    dotClassName: 'bg-amber',
  },

  action_required: {
    label: 'Action Required',
    className:
      'bg-amber-pale text-amber-ink ring-1 ring-inset ring-amber/40',
    dotClassName: 'bg-amber',
  },

  ready_to_depart: {
    label: 'Ready to Depart',
    className:
      'bg-forest text-white ring-1 ring-inset ring-forest/20',
    dotClassName: 'bg-white/80',
  },

  completed: {
    label: 'Loading Completed',
    className:
      'bg-canvas text-forest ring-1 ring-inset ring-brand/25',
    dotClassName: 'bg-brand',
  },

  loading_completed: {
    label: 'Loading Completed',
    className:
      'bg-canvas text-forest ring-1 ring-inset ring-brand/25',
    dotClassName: 'bg-brand',
  },
};

export function LoaderStatusChip({
  status,
}: {
  status: LoaderQueueStatus;
}) {
  const config = STATUS_STYLES[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold ${config.className}`}
    >
      <span
        aria-hidden="true"
        className={`h-1.5 w-1.5 rounded-full ${config.dotClassName}`}
      />

      {config.label}
    </span>
  );
}