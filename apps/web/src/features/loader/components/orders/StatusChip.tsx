import React from 'react';
import type { OrderStatus } from '../../types/orders';
import { STATUS_CONFIG } from '../../utils/status';
const GREEN_STATUS_STYLES: Record<OrderStatus, string> = {
  placed: 'bg-canvas text-ink ring-1 ring-inset ring-line',
  confirmed: 'bg-brand-pale text-forest ring-1 ring-inset ring-brand/35',
  planned: 'bg-brand-mint/70 text-forest ring-1 ring-inset ring-brand-mint',
  loading: 'bg-brand-medium text-white',
  in_transit: 'bg-brand text-white',
  delivered: 'bg-forest text-white',
  receipt_confirmed: 'bg-forest text-white ring-1 ring-inset ring-white/35',
  deferred: 'bg-brand-mint/50 text-forest ring-2 ring-inset ring-forest/60'
};
export function StatusChip({
  status


}: {status: OrderStatus;}) {
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${GREEN_STATUS_STYLES[status]}`}>
      {STATUS_CONFIG[status].label}
    </span>;
}