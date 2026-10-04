import type { OrderStatus } from '../types/orders';

export const STATUS_CONFIG: Record<OrderStatus, {label: string;dot: string;bg: string;}> = {
  placed: { label: 'Placed', dot: 'bg-hatch', bg: 'bg-canvas' },
  confirmed: { label: 'Confirmed', dot: 'bg-teal', bg: 'bg-teal/10' },
  planned: { label: 'Planned', dot: 'bg-purple', bg: 'bg-purple/10' },
  loading: { label: 'Loading', dot: 'bg-blue', bg: 'bg-blue/10' },
  in_transit: { label: 'In Transit', dot: 'bg-blue', bg: 'bg-blue/10' },
  delivered: { label: 'Delivered', dot: 'bg-brand-medium', bg: 'bg-brand-pale' },
  receipt_confirmed: { label: 'Receipt Confirmed', dot: 'bg-forest', bg: 'bg-forest/10' },
  deferred: { label: 'Deferred', dot: 'bg-amber', bg: 'bg-amber-pale' }
};