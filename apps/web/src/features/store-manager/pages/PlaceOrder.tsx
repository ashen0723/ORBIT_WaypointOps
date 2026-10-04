import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
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
import { nextDeliveryDateColombo } from '../api/storeApi';
import { CUTOFF_MINUTES, NEXT_DELIVERY, OUTLET_NAME } from '../data/schedule';
import { createBlankLine, isLineComplete, lineError } from '../utils/lineDrafts';
import { estimateLoad } from '../utils/estimate';
import { formatClock } from '../utils/time';
import { formatDate } from '../utils/format';
import { useScreenInit } from '../useScreenInit.js';

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
  const { orders, catalog, live, loading, error, store, addOrder } = useOrders();
  const actionId = useRef<string | null>(null);
  const screenInit = useScreenInit();
  const initialBrand = (['Fresh', 'Style', 'Tech'] as Brand[]).includes(screenInit.brand ?? 'Fresh') ? (screenInit.brand ?? 'Fresh') : 'Fresh';
  const initialFreshType = (['dry', 'chilled'] as OrderType[]).includes(screenInit.freshType ?? 'dry') ? (screenInit.freshType ?? 'dry') : 'dry';
  const [brand, setBrand] = useState<Brand>(initialBrand);
  const [freshType, setFreshType] = useState<OrderType>(initialFreshType);
  const [drafts, setDrafts] = useState(live ? {} : initialDrafts);
  const [showErrors, setShowErrors] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (live && catalog.length > 0 && !catalog.some(item => item.brand === brand)) setBrand(catalog[0].brand);
  }, [live, catalog, brand]);

  useEffect(() => { actionId.current = null; }, [brand, freshType, drafts]);

  const type: OrderType = brand === 'Fresh' ? freshType : 'dry';
  const key = `${brand}-${type}`;
  const lines = drafts[key] ?? [{ id: `initial-${key}`, name: '', qty: '', unit: suggestionsUnit() }];
  function suggestionsUnit() { return catalog.find(c => c.brand === brand && c.type === type)?.unit ?? 'units'; }
  const delivery = live ? { date: store?.nextDeliveryDate ?? nextDeliveryDateColombo(), note: 'Next eligible delivery run' } : NEXT_DELIVERY[brand];
  const suggestions = catalog.filter((c) => c.brand === brand && c.type === type);
  const valid = lines.filter(isLineComplete).map((l) => ({ name: l.name.trim(), qty: Number(l.qty), unit: l.unit }));
  const hasPartial = lines.some((l) => lineError(l) !== null);
  const load = live ? valid.reduce((sum, line) => { const item = suggestions.find(c => c.name === line.name && c.unit === line.unit); return { kg: sum.kg + (item?.kg ?? 0) * line.qty, m3: sum.m3 + (item?.m3 ?? 0) * line.qty }; }, { kg: 0, m3: 0 }) : estimateLoad(valid);
  const totalQty = valid.reduce((s, l) => s + l.qty, 0);
  const pastCutoff = live ? !store?.nextDeliveryDate : cutoffSeconds === 0;

  const findSubmitted = (b: Brand, t: OrderType) =>
  orders.find((o) => o.brand === b && o.type === t && o.requestedDate === (live ? delivery.date : NEXT_DELIVERY[b].date));
  const prior = findSubmitted(brand, type);

  const helpText = live && (loading || catalog.length === 0) ? 'Loading your outlet catalogue…' :
  live && error ? error : pastCutoff ?
  'No eligible delivery run is available. Please contact your dispatch team.' :
  valid.length === 0 ?
  'Add at least one item with a quantity to submit.' :
  hasPartial && showErrors ?
  'Finish or remove incomplete lines before submitting.' :
  null;

  const setLines = (next: LineDraft[]) => setDrafts((prev) => ({ ...prev, [key]: next }));

  const handleSubmit = async () => {
    if (pastCutoff || submitting || (live && (loading || catalog.length === 0))) return;
    if (valid.length === 0 || hasPartial) {
      setShowErrors(true);
      return;
    }
    if (live && valid.some(line => !suggestions.some(product => product.name === line.name && product.unit === line.unit) || !Number.isSafeInteger(line.qty))) {
      setShowErrors(true);
      toast.error('Choose catalogue items with whole-number quantities.');
      return;
    }
    setSubmitting(true);
    try {
      actionId.current ??= crypto.randomUUID();
      const nowLabel = live ? new Date().toLocaleTimeString('en-LK', { timeZone: 'Asia/Colombo', hour: '2-digit', minute: '2-digit' }) : formatClock(CUTOFF_MINUTES - Math.ceil(cutoffSeconds / 60));
      const order = await addOrder({
        brand,
        type,
        requestedDate: delivery.date,
        submittedAt: `Today, ${nowLabel}`,
        items: valid.map((l, i) => ({ id: `n${i}`, ...l }))
      }, actionId.current);
      actionId.current = null;
      setDrafts((prev) => ({ ...prev, [key]: [createBlankLine(suggestions[0]?.unit)] }));
      navigate(`/orders/${order.id}/confirmation`);
    } catch (cause) {
      toast.error('Order was not submitted', { description: cause instanceof Error ? cause.message : 'Please try again.' });
    } finally { setSubmitting(false); }
  };

  const countDrafted = (t: OrderType) => (drafts[`Fresh-${t}`] ?? []).filter(isLineComplete).length;

  return (
    <PageContainer>
      <PageHeader title="Place Order" subtitle={`${live ? (store?.outletName ?? 'Your outlet') : OUTLET_NAME} · orders for the next delivery run`} />
      <CutoffBanner seconds={cutoffSeconds} />

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <fieldset disabled={pastCutoff || (live && loading)} className="min-w-0 space-y-6">
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
                    options={(live ? [...new Set(catalog.map(item => item.brand))] : ['Fresh', 'Style', 'Tech'] as Brand[]).map((b) => ({
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
          pastCutoff={pastCutoff || (live && (loading || catalog.length === 0))}
          submitting={submitting}
          onSubmit={handleSubmit} />
        
      </div>
    </PageContainer>);

}
