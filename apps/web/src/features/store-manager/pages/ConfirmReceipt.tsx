import { apiFetch } from '../../../api/client';
import { useAuth } from '../../../app/providers/AuthProvider';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2Icon, TriangleAlertIcon } from 'lucide-react';
import type { ItemCheck } from '../types/receipt';
import type { ReceiptQuantityLine } from '../api/storeApi';
import { useOrders } from '../contexts/OrdersContext';
import { PageContainer } from '../components/ui/PageContainer';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Button, buttonStyles } from '../components/ui/Button';
import { BrandTag } from '../components/orders/BrandTag';
import { ChilledTag } from '../components/orders/ChilledTag';
import { OrderNotFound } from '../components/orders/OrderNotFound';
import { ProofOfDelivery } from '../components/receipt/ProofOfDelivery';
import { ReceiptItemRow } from '../components/receipt/ReceiptItemRow';
import { formatTime24 } from '../utils/time';
import { relativeDay } from '../utils/format';

const emptyCheck = (): ItemCheck => ({ result: null, issueType: null, description: '', photos: [], acceptedQty: '', damagedQty: '', missingQty: '' });

export function ConfirmReceipt() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const { getOrder, confirmReceipt, live, loading } = useOrders();
  const actionId = useRef<string | null>(null);
  const order = getOrder(orderId);
  const [checks, setChecks] = useState<Record<string, ItemCheck>>(() =>
  Object.fromEntries((order?.items ?? []).map((i): [string, ItemCheck] => [i.id, emptyCheck()]))
  );
  const [attempted, setAttempted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (order) setChecks(previous => Object.fromEntries(order.items.map(item => [item.id, previous[item.id] ?? emptyCheck()])));
  }, [order?.id]);

  if (!order) return loading ? <PageContainer><p role="status">Loading order…</p></PageContainer> : <OrderNotFound />;

  if ((!order.deliveryId && live) || (!live && order.status !== 'delivered') || order.receiptConfirmed) {
    const confirmed = order.status === 'receipt_confirmed' || order.receiptConfirmed;
    return (
      <PageContainer>
        <Card className="mx-auto max-w-[480px] p-8 text-center">
          <h1 className="text-xl font-semibold text-ink">{confirmed ? 'Receipt already confirmed' : 'Not delivered yet'}</h1>
          <p className="mt-2 text-subtle">
            {confirmed ? `${order.id} was checked and confirmed.` : `You can confirm receipt for ${order.id} once the driver marks it delivered.`}
          </p>
          <Link to={`/orders/${order.id}`} className={`${buttonStyles('primary', 'md')} mt-6`}>
            View order status
          </Link>
        </Card>
      </PageContainer>);

  }

  const items = live ? order.items.filter(item => item.deliveredQty !== undefined) : order.items;
  const checkedCount = items.filter((i) => checks[i.id]?.result === 'ok' || checks[i.id]?.result === 'issue').length;
  const flagged = items.filter((i) => checks[i.id]?.result === 'issue');
  const incompleteIssues = flagged.filter((i) => {
    const check = checks[i.id];
    if (!check.issueType || !check.description.trim()) return true;
    if (!live) return false;
    const values = [check.acceptedQty, check.damagedQty, check.missingQty].map(Number);
    return [check.acceptedQty, check.damagedQty, check.missingQty].some(value => value === '') || values.some(value => !Number.isSafeInteger(value) || value < 0) || values.reduce((sum, value) => sum + value, 0) !== (i.deliveredQty ?? 0);
  });
  const unchecked = items.length - checkedCount;

  const setCheck = (id: string, check: ItemCheck) => { actionId.current = null; setChecks((prev) => ({ ...prev, [id]: check })); };
  const markAllOk = () => { actionId.current = null; setChecks(previous => Object.fromEntries(items.map(item => {
    const check = previous[item.id] ?? emptyCheck();
    return [item.id, check.result === null ? { ...check, result: 'ok' } : check];
  }))); };

  const handleConfirm = async () => {
    setAttempted(true);
    if (unchecked > 0 || incompleteIssues.length > 0 || (live && (!order.deliveryId || items.length === 0))) return;
    setSubmitting(true);
    try {
      actionId.current ??= crypto.randomUUID();
      const receiptLines: ReceiptQuantityLine[] = await Promise.all(items.map(async item => {
        const check = checks[item.id];
        const photoRefs: string[] = [];
        if (live && check.result === 'issue') for (const photo of check.photos) {
          if (!photo.file) continue;
          const body = new FormData(); body.set('file', photo.file); body.set('orderId', order.id); body.set('clientActionId', photo.id);
          const saved = await apiFetch<{ evidenceId: string }>('/evidence', { method: 'POST', token, body });
          photoRefs.push(saved.evidenceId);
        }
        return {
          orderLineId: item.id,
          acceptedQty: check.result === 'ok' ? (item.deliveredQty ?? item.qty) : Number(check.acceptedQty),
          damagedQty: check.result === 'ok' ? 0 : Number(check.damagedQty),
          missingQty: check.result === 'ok' ? 0 : Number(check.missingQty),
          note: check.result === 'issue' ? check.description.trim() : null,
          photoRefs,
        };
      }));
      await confirmReceipt(order, receiptLines, actionId.current);
      actionId.current = null;
      toast.success('Receipt confirmed', {
        description: flagged.length ?
        `${flagged.length} flagged item${flagged.length === 1 ? '' : 's'} reported to the dispatcher.` :
        'All items received OK.'
      });
      navigate(`/orders/${order.id}`);
    } catch (cause) {
      toast.error('Receipt was not confirmed', { description: cause instanceof Error ? cause.message : 'Please try again.' });
    } finally { setSubmitting(false); }
  };

  return (
    <PageContainer>
      <PageHeader
        backTo={{ to: `/orders/${order.id}`, label: order.id }}
        title="Confirm Receipt"
        subtitle={
        <>
            Order <span className="font-semibold text-ink">{order.id}</span> · delivered {relativeDay(order.requestedDate).toLowerCase()} at{' '}
            {order.deliveredAt ? formatTime24(order.deliveredAt) : '—'}
          </>
        }
        meta={
        <>
            <BrandTag brand={order.brand} />
            {order.type === 'chilled' && <ChilledTag />}
          </>
        } />
      

      <div className="mt-6 grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)] lg:items-start">
        <ProofOfDelivery order={order} />

        <Card className="overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-line px-4 py-4 sm:flex-row sm:items-center sm:justify-between md:px-6">
            <div>
              <h2 className="text-base font-semibold text-ink">Itemized checklist</h2>
              <p className="text-sm text-subtle">
                {checkedCount} of {items.length} items checked
              </p>
            </div>
            <Button variant="secondary" size="md" onClick={markAllOk} disabled={unchecked === 0} className="w-full sm:w-auto">
              Mark remaining as received OK
            </Button>
          </div>
          <ul className="divide-y divide-line">
            {items.map((item) =>
            <ReceiptItemRow key={item.id} item={item} check={checks[item.id] ?? emptyCheck()} live={live} showErrors={attempted} onChange={(c) => setCheck(item.id, c)} />
            )}
          </ul>
          <div className="space-y-4 border-t border-line px-4 py-4 md:px-6 md:py-6">
            {flagged.length > 0 &&
            <p role="status" className="flex items-start gap-3 rounded-lg border border-amber bg-amber-pale px-4 py-3 text-sm font-medium text-amber-ink">
                <TriangleAlertIcon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                {flagged.length} item{flagged.length === 1 ? '' : 's'} flagged — this will be reported to the dispatcher
              </p>
            }
            {attempted && (unchecked > 0 || incompleteIssues.length > 0) &&
            <p role="alert" className="text-sm font-medium text-danger-ink">
                {unchecked > 0 ?
              `Mark ${unchecked} remaining item${unchecked === 1 ? '' : 's'} before confirming.` :
              live ? 'Add an issue type, description, and quantities that total the Driver handover.' : 'Add an issue type and description for each flagged item.'}
              </p>
            }
            <div className="flex md:justify-end">
              <Button size="lg" onClick={handleConfirm} disabled={submitting} className="w-full md:w-auto">
                {submitting && <Loader2Icon aria-hidden="true" className="h-5 w-5 animate-spin" />}
                {submitting ? 'Confirming…' : 'Confirm Receipt'}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </PageContainer>);

}
