import type { DeliveryStatus } from '../../types/driver';

const STATUS_STYLES: Record<DeliveryStatus, string> = {
  Planned: 'bg-canvas text-ink ring-1 ring-inset ring-line',
  Loaded: 'bg-brand-medium text-white',
  'Out for delivery': 'bg-brand text-white',
  Arrived: 'bg-brand-pale text-forest ring-1 ring-inset ring-brand/35',
  Delivered: 'bg-forest text-white',
  'Partially delivered': 'bg-amber-pale text-amber-ink ring-1 ring-inset ring-amber/45',
  Failed: 'bg-danger-pale text-danger-ink ring-1 ring-inset ring-danger/35',
  'Changed by dispatcher': 'bg-purple text-white'
};

export function DriverStatusChip({ status }: {status: DeliveryStatus;}) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[status]}`}>
      {status}
    </span>);

}