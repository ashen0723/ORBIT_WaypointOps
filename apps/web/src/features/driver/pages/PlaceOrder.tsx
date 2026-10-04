import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PackageIcon, SnowflakeIcon } from 'lucide-react';
import type { Brand, LineDraft, OrderType } from '../types/orders';
import { useOrders } from '../contexts/OrdersContext';
import { useCutoffSeconds } from '../contexts/CutoffContext';
import { PageContainer } from '../components/ui/PageContainer';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { CutoffBanner } from '../components/orders/CutoffBanner';
import { FreshOrderTabs } from '../components/order-form/FreshOrderTabs';
import { LineItemsEditor } from '../components/order-form/LineItemsEditor';
import { OrderSummary } from '../components/order-form/OrderSummary';
import { catalog } from '../data/catalog';
import { CUTOFF_MINUTES, NEXT_DELIVERY, OUTLET_NAME } from '../data/schedule';
import { createBlankLine, isLineComplete, lineError } from '../utils/lineDrafts';
import { estimateLoad } from '../utils/estimate';
import { formatClock } from '../utils/time';
import { formatDate } from '../utils/format';

const initialDrafts: Record<string, LineDraft[]> = {
  'Fresh-dry': [
  { id: 'seed-1', name: 'Sourdough loaf', qty: '6', unit: 'crates' },
  { id: 'seed-2', name: 'Penne 500g', qty: '4', unit: 'cases' }],

  'Fresh-chilled': [createBlankLine('cases')],
  'Style-dry': [createBlankLine('cases')],
  'Tech-dry': [createBlankLine('units')]
};

export function PlaceOrder() {
  const navigate = useNavigate();
  const cutoffSeconds = useCutoffSeconds();
  const { orders, addOrder } = useOrders();
  const [brand, setBrand] = useState<Brand>('Fresh');
  const [freshType, setFreshType] = useState<OrderType>('dry');
  const [drafts, setDrafts] = useState(initialDrafts);
  const [showErrors, setShowErrors] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const type: OrderType = brand === 'Fresh' ? freshType : 'dry';
  const key = `${brand}-${type}`;
  const lines = drafts[key] ?? [createBlankLine()];
  const delivery = NEXT_DELIVERY[brand];
  const suggestions = catalog.filter((c) => c.brand === brand && c.type === type);
  const valid = lines.filter(isLineComplete).map((l) => ({ name: l.name.trim(), qty: Number(l.qty), unit: l.unit }));
  const hasPartial = lines.some((l) => lineError(l) !== null);
  const load = estimateLoad(valid);
  const totalQty = valid.reduce((s, l) => s + l.qty, 0);
  const pastCutoff = cutoffSeconds === 0;

  const findSubmitted = (b: Brand, t: OrderType) =>
  orders.find((o) => o.brand === b && o.type === t && o.requestedDate === NEXT_DELIVERY[b].date);
  const prior = findSubmitted(brand, type);

  const helpText = pastCutoff ?
  'Submission is closed — the 4:00 PM cutoff has passed. Your draft is kept; submit from 6:00 AM tomorrow for the following run.' :
  valid.length === 0 ?
  'Add at least one item with a quantity to submit.' :
  hasPartial && showErrors ?
  'Finish or remove incomplete lines before submitting.' :
  null;

  const setLines = (next: LineDraft[]) => setDrafts((prev) => ({ ...prev, [key]: next }));

  const handleSubmit = () => {
    if (pastCutoff || submitting) return;
    if (valid.length === 0 || hasPartial) {
      setShowErrors(true);
      return;
    }
    setSubmitting(true);
    window.setTimeout(() => {
      const nowLabel = formatClock(CUTOFF_MINUTES - Math.ceil(cutoffSeconds / 60));
      const order = addOrder({
        brand,
        type,
        requestedDate: delivery.date,
        submittedAt: `Today, ${nowLabel}`,
        items: valid.map((l, i) => ({ id: `n${i}`, ...l }))
      });
      setDrafts((prev) => ({ ...prev, [key]: [createBlankLine(suggestions[0]?.unit)] }));
      navigate(`/orders/${order.id}/confirmation`);
    }, 700);
  };

  const countDrafted = (t: OrderType) => (drafts[`Fresh-${t}`] ?? []).filter(isLineComplete).length;

  return (
    <PageContainer>
      <PageHeader title="Place Order" subtitle={`${OUTLET_NAME} · orders for the next delivery run`} />
      <CutoffBanner seconds={cutoffSeconds} />

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <fieldset disabled={pastCutoff} className="min-w-0 space-y-6">
          <legend className="sr-only">Order details</legend>
          <Card className="p-4 md:p-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <h2 className="text-sm font-semibold text-ink">Brand</h2>
                <div className="mt-2">
                  <SegmentedControl<Brand>
                    label="Brand"
                    value={brand}
                    onChange={(b) => {
                      setBrand(b);
                      setShowErrors(false);
                    }}
                    selectedClassName="bg-forest text-white shadow-card hover:bg-brand"
                    options={(['Fresh', 'Style', 'Tech'] as Brand[]).map((b) => ({
                      value: b,
                      label: b
                    }))} />
                  
                </div>
                <p className="mt-2 text-sm text-subtle">
                  {delivery.note} · next delivery {formatDate(delivery.date)}
                </p>
              </div>
              <div>
                <h2 className="text-sm font-semibold text-ink">Delivery type</h2>
                <div className="mt-2">
                  {brand === 'Fresh' ?
                  <FreshOrderTabs
                    value={freshType}
                    onChange={(t) => {
                      setFreshType(t);
                      setShowErrors(false);
                    }}
                    info={{
                      dry: { drafted: countDrafted('dry'), submittedId: findSubmitted('Fresh', 'dry')?.id },
                      chilled: { drafted: countDrafted('chilled'), submittedId: findSubmitted('Fresh', 'chilled')?.id }
                    }} /> :


                  <SegmentedControl<OrderType>
                    label="Delivery type"
                    value="dry"
                    onChange={() => undefined}
                    options={[
                    { value: 'dry', label: 'Dry', icon: <PackageIcon aria-hidden="true" className="h-4 w-4" /> },
                    { value: 'chilled', label: 'Chilled', disabled: true, icon: <SnowflakeIcon aria-hidden="true" className="h-4 w-4" /> }]
                    } />

                  }
                </div>
                <p className="mt-2 text-sm text-subtle">
                  {brand === 'Fresh' ?
                  'Dry and chilled are separate orders for the same day — submit each on its own.' :
                  `${brand} ships dry only. Chilled is available for Fresh.`}
                </p>
              </div>
            </div>
          </Card>

          <Card
            className="p-4 md:p-6"
            id="line-items-panel"
            role={brand === 'Fresh' ? 'tabpanel' : undefined}
            aria-labelledby={brand === 'Fresh' ? `tab-${freshType}` : undefined}>
            
            <div className="mb-4 flex items-baseline justify-between gap-4">
              <h2 className="text-base font-semibold text-ink">
                Items · {brand} {type === 'chilled' ? 'chilled' : 'dry'}
              </h2>
              <span className="text-sm text-subtle">
                {valid.length} of {lines.length} complete
              </span>
            </div>
            <LineItemsEditor
              lines={lines}
              onChange={setLines}
              suggestions={suggestions}
              listId={`catalog-${key}`}
              showErrors={showErrors} />
            
          </Card>
        </fieldset>

        <OrderSummary
          brand={brand}
          type={type}
          lineCount={valid.length}
          totalQty={totalQty}
          kg={load.kg}
          m3={load.m3}
          requestedDate={delivery.date}
          deliveryNote={delivery.note}
          priorOrderId={prior?.id}
          helpText={helpText}
          pastCutoff={pastCutoff}
          submitting={submitting}
          onSubmit={handleSubmit} />
        
      </div>
    </PageContainer>);

}