import React from 'react';
import { Loader2Icon, PackageIcon } from 'lucide-react';
import type { Brand, OrderType } from '../../types/orders';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { BrandTag } from '../orders/BrandTag';
import { ChilledTag } from '../orders/ChilledTag';
import { formatDate } from '../../utils/format';

interface OrderSummaryProps {
  brand: Brand;
  type: OrderType;
  lineCount: number;
  totalQty: number;
  kg: number;
  m3: number;
  requestedDate: string;
  deliveryNote: string;
  priorOrderId?: string;
  helpText: string | null;
  pastCutoff: boolean;
  submitting: boolean;
  onSubmit: () => void;
}

export function OrderSummary(props: OrderSummaryProps) {
  const { brand, type, lineCount, totalQty, kg, m3, requestedDate, deliveryNote, priorOrderId, helpText, pastCutoff, submitting, onSubmit } = props;
  const label = brand === 'Fresh' ? `Submit ${type === 'chilled' ? 'Chilled' : 'Dry'} Order` : 'Submit Order';

  const rows = [
  { term: 'Line items', value: String(lineCount) },
  { term: 'Total quantity', value: String(totalQty) },
  { term: 'Est. weight', value: `${kg.toFixed(1)} kg` },
  { term: 'Est. volume', value: `${m3.toFixed(2)} m³` }];


  return (
    <Card className="p-4 md:p-6 lg:sticky lg:top-24">
      <h2 className="text-base font-semibold text-ink">Order summary</h2>
      <div className="mt-2 flex flex-wrap gap-2">
        <BrandTag brand={brand} />
        {type === 'chilled' ?
        <ChilledTag /> :

        <span className="inline-flex items-center gap-1 rounded-md bg-canvas px-2 py-0.5 text-xs font-semibold text-subtle">
            <PackageIcon aria-hidden="true" className="h-3 w-3" />
            Dry
          </span>
        }
      </div>
      <dl className="mt-4 divide-y divide-line text-sm">
        {rows.map((r) =>
        <div key={r.term} className="flex justify-between gap-4 py-2">
            <dt className="text-subtle">{r.term}</dt>
            <dd className="font-medium tabular-nums text-ink">{r.value}</dd>
          </div>
        )}
        <div className="flex justify-between gap-4 py-2">
          <dt className="text-subtle">Requested delivery</dt>
          <dd className="text-right">
            <span className="block font-semibold text-ink">{formatDate(requestedDate)}</span>
            <span className="block text-xs text-subtle">{deliveryNote}</span>
          </dd>
        </div>
      </dl>
      {priorOrderId &&
      <p className="mt-2 rounded-lg bg-canvas px-3 py-2 text-xs text-subtle">
          {priorOrderId} is already submitted for this day. This will go as a separate, additional order.
        </p>
      }
      <Button
        size="lg"
        fullWidth
        className="mt-4"
        onClick={onSubmit}
        disabled={pastCutoff || submitting}
        aria-describedby={helpText ? 'submit-help' : undefined}>
        
        {submitting && <Loader2Icon aria-hidden="true" className="h-5 w-5 animate-spin" />}
        {submitting ? 'Submitting…' : label}
      </Button>
      {helpText &&
      <p id="submit-help" className={`mt-2 text-sm ${pastCutoff ? 'font-medium text-danger-ink' : 'text-subtle'}`}>
          {helpText}
        </p>
      }
    </Card>);

}