import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowRightIcon, CircleCheckIcon, ClockIcon, Loader2Icon, TriangleAlertIcon } from 'lucide-react';
import { useOrders } from '../contexts/OrdersContext';
import { PageContainer } from '../components/ui/PageContainer';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { BrandTag } from '../components/orders/BrandTag';
import { ChilledTag } from '../components/orders/ChilledTag';
import { OrderNotFound } from '../components/orders/OrderNotFound';
import { NEXT_DELIVERY } from '../data/schedule';
import { formatDate, formatDateLong } from '../utils/format';

type RequestMode = 'priority' | 'urgency';

const FORMS: Record<RequestMode, {title: string;description: string;reasons: string[];submit: string;sent: string;}> = {
  priority: {
    title: 'Request Priority',
    description: 'Ask dispatch to move this order onto an earlier run. You’ll get a reply by 6:00 PM today.',
    reasons: ['Promotion or display starting before the new date', 'Shelves already empty for these lines', 'Customer pre-orders waiting', 'Other'],
    submit: 'Send Priority Request',
    sent: 'Priority requested'
  },
  urgency: {
    title: 'Report Urgency',
    description: 'Tell dispatch what’s at risk if this waits. It’s logged against the order even if the date can’t change.',
    reasons: ['Out of stock today', 'Out of stock within 24 hours', 'Significant lost sales expected', 'Other'],
    submit: 'Send Urgency Report',
    sent: 'Urgency reported'
  }
};

export function DeferralNotice() {
  const { orderId } = useParams();
  const { getOrder, loading, live } = useOrders();
  const order = getOrder(orderId);
  const [mode, setMode] = useState<RequestMode | null>(null);
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [attempted, setAttempted] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<{mode: RequestMode;reason: string;}[]>([]);

  if (!order || !order.deferral) return loading ? <PageContainer><p role="status">Loading order…</p></PageContainer> : <OrderNotFound />;
  const deferral = order.deferral;
  const form = mode ? FORMS[mode] : null;

  const openForm = (m: RequestMode) => {
    setReason('');
    setDetails('');
    setAttempted(false);
    setMode(m);
  };

  const submit = () => {
    setAttempted(true);
    if (!mode || !reason || !details.trim()) return;
    setSending(true);
    window.setTimeout(() => {
      setSent((prev) => [...prev, { mode, reason }]);
      toast.success(FORMS[mode].sent, { description: `Sent to dispatch for ${order.id}.` });
      setSending(false);
      setMode(null);
    }, 700);
  };

  const fieldBase =
  'mt-2 w-full rounded-lg border bg-surface px-3 text-base text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 lg:text-sm';

  return (
    <PageContainer>
      <div className="mx-auto w-full max-w-[640px]">
        <Link
          to={`/orders/${order.id}`}
          className="mb-4 inline-flex items-center gap-1 rounded text-sm font-medium text-subtle hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
          
          ← {order.id}
        </Link>
        <Card className="overflow-hidden">
          <div role="alert" className="flex items-start gap-3 border-b border-amber/40 bg-amber-pale px-4 py-4 md:px-6 md:py-6">
            <TriangleAlertIcon aria-hidden="true" className="mt-1 h-6 w-6 shrink-0 text-amber-ink" />
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-ink lg:text-[32px] lg:leading-tight">Order Deferred</h1>
              <p className="mt-1 text-sm text-amber-ink">This order won’t arrive on its original date. Decided {deferral.decidedAt}.</p>
            </div>
          </div>

          <div className="space-y-6 p-4 md:p-6">
            <div className="flex flex-wrap items-center gap-2">
              <Link to={`/orders/${order.id}`} className="text-xl font-semibold tabular-nums text-ink hover:text-brand">
                {order.id}
              </Link>
              <BrandTag brand={order.brand} />
              {order.type === 'chilled' && <ChilledTag />}
            </div>

            <div className="grid items-center gap-4 rounded-lg border border-line p-4 sm:grid-cols-[1fr_auto_1.4fr]">
              <div>
                <p className="text-xs text-subtle">Original requested date</p>
                <p className="mt-1 text-lg text-subtle">
                  <del>{formatDate(deferral.originalDate)}</del>
                </p>
              </div>
              <ArrowRightIcon aria-hidden="true" className="hidden h-5 w-5 text-muted sm:block" />
              <div>
                <p className="text-xs text-subtle">New expected date</p>
                <p className="mt-1 text-lg font-semibold text-ink">{formatDateLong(deferral.newDate)}</p>
                {!live && <p className="text-sm text-subtle">{NEXT_DELIVERY[order.brand].note}</p>}
              </div>
            </div>

            <section aria-labelledby="reason-heading" className="rounded-lg bg-canvas p-4">
              <h2 id="reason-heading" className="text-sm font-semibold text-subtle">
                Why it was deferred
              </h2>
              <p className="mt-2 font-semibold text-ink">{deferral.reason}</p>
              <p className="mt-1 text-ink">{deferral.detail}</p>
            </section>

            <p className="flex items-start gap-3 text-ink">
              <CircleCheckIcon aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-brand-medium" />
              <span>
                No action needed — your order is queued for the next run automatically. You’ll get an ETA once the dispatcher plans the route.
              </span>
            </p>

            {sent.length > 0 &&
            <ul className="space-y-2" aria-live="polite">
                {sent.map((s, i) =>
              <li key={i} className="flex items-start gap-3 rounded-lg border border-line p-4 text-sm">
                    <ClockIcon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-subtle" />
                    <span>
                      <span className="font-semibold text-ink">{FORMS[s.mode].sent}</span>
                      <span className="text-subtle"> · “{s.reason}” · awaiting dispatch reply</span>
                    </span>
                  </li>
              )}
              </ul>
            }

            {live ? <p className="text-sm text-subtle">Contact dispatch through your team’s agreed channel for priority changes.</p> : <div className="grid gap-3 sm:grid-cols-2">
              <Button variant="outline" size="lg" fullWidth onClick={() => openForm('priority')}>
                Request Priority
              </Button>
              <Button variant="outline" size="lg" fullWidth onClick={() => openForm('urgency')}>
                Report Urgency
              </Button>
            </div>}
          </div>
        </Card>
      </div>

      <Modal open={mode !== null} onClose={() => setMode(null)} title={form?.title ?? ''} description={form?.description}>
        {form &&
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="space-y-4">
          
            <div>
              <label htmlFor="req-reason" className="text-sm font-semibold text-ink">
                Reason <span className="text-danger-ink">*</span>
              </label>
              <select
              id="req-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              aria-invalid={attempted && !reason}
              className={`${fieldBase} h-10 ${attempted && !reason ? 'border-danger' : 'border-line'}`}>
              
                <option value="">Select a reason</option>
                {form.reasons.map((r) =>
              <option key={r} value={r}>
                    {r}
                  </option>
              )}
              </select>
              {attempted && !reason && <p className="mt-1 text-xs font-medium text-danger-ink">Choose a reason</p>}
            </div>
            <div>
              <label htmlFor="req-details" className="text-sm font-semibold text-ink">
                Details <span className="text-danger-ink">*</span>
              </label>
              <textarea
              id="req-details"
              rows={4}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              aria-invalid={attempted && !details.trim()}
              placeholder="e.g. Festival display goes up Wednesday morning; tees and jeans are the main stock"
              className={`${fieldBase} py-2 placeholder:text-muted ${attempted && !details.trim() ? 'border-danger' : 'border-line'}`} />
            
              {attempted && !details.trim() && <p className="mt-1 text-xs font-medium text-danger-ink">Add a short explanation</p>}
            </div>
            <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
              <Button variant="secondary" size="lg" onClick={() => setMode(null)}>
                Cancel
              </Button>
              <Button type="submit" size="lg" disabled={sending}>
                {sending && <Loader2Icon aria-hidden="true" className="h-4 w-4 animate-spin" />}
                {sending ? 'Sending…' : form.submit}
              </Button>
            </div>
          </form>
        }
      </Modal>
    </PageContainer>);

}
