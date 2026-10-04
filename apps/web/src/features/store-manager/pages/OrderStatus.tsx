import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { HeadsetIcon, PhoneIcon } from 'lucide-react';
import { useOrders } from '../contexts/OrdersContext';
import { PageContainer } from '../components/ui/PageContainer';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Button, buttonStyles } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { BrandTag } from '../components/orders/BrandTag';
import { ChilledTag } from '../components/orders/ChilledTag';
import { StatusChip } from '../components/orders/StatusChip';
import { EtaCard } from '../components/orders/EtaCard';
import { StatusTimeline } from '../components/orders/StatusTimeline';
import { RouteMap } from '../components/orders/RouteMap';
import { OrderNotFound } from '../components/orders/OrderNotFound';
import { DISPATCHER } from '../data/schedule';
import { formatDate } from '../utils/format';
import { totalQuantity } from '../utils/orders';

export function OrderStatus() {
  const { orderId } = useParams();
  const { getOrder, loading, live } = useOrders();
  const [contactOpen, setContactOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messageError, setMessageError] = useState(false);
  const order = getOrder(orderId);

  if (!order) return loading ? <PageContainer><p role="status">Loading order…</p></PageContainer> : <OrderNotFound />;

  const primary =
  (live ? Boolean(order.deliveryId) : order.status === 'delivered') && !order.receiptConfirmed ?
  { label: 'Confirm Receipt', to: `/orders/${order.id}/receipt` } :
  order.status === 'deferred' ?
  { label: 'View Deferral Notice', to: `/orders/${order.id}/deferral` } :
  null;

  const sendMessage = () => {
    if (!message.trim()) {
      setMessageError(true);
      return;
    }
    toast.success('Message sent to dispatcher', { description: `${DISPATCHER.name} will reply about ${order.id}.` });
    setMessage('');
    setMessageError(false);
    setContactOpen(false);
  };

  const details = [
  { term: 'Order ID', value: order.id },
  { term: 'Brand', value: order.brand },
  { term: 'Delivery type', value: order.type === 'chilled' ? 'Chilled' : 'Dry' },
  { term: 'Requested date', value: formatDate(order.requestedDate) },
  { term: 'Submitted', value: order.submittedAt },
  { term: 'Dispatcher', value: live ? 'Dispatch team' : DISPATCHER.name }];


  return (
    <PageContainer>
      <PageHeader
        backTo={{ to: '/', label: 'My Orders' }}
        title={order.id}
        meta={
        <>
            <BrandTag brand={order.brand} />
            {order.type === 'chilled' && <ChilledTag />}
            <StatusChip status={order.status} />
          </>
        }
        actions={
        <>
            {<Button variant="secondary" size="lg" onClick={() => setContactOpen(true)} className="flex-1 md:flex-none">
              <HeadsetIcon aria-hidden="true" className="h-4 w-4" />
              Contact Dispatcher
            </Button>}
            {primary &&
          <Link to={primary.to} className={`${buttonStyles('primary', 'lg')} flex-1 md:flex-none`}>
                {primary.label}
              </Link>
          }
          </>
        } />
      

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {order.deliveryError && <Card className="p-4 text-danger-ink" role="alert">Delivery details unavailable: {order.deliveryError}</Card>}
          <EtaCard order={order} />
          <Card className="p-4 md:p-6">
            <h2 className="text-base font-semibold text-ink">Status</h2>
            <div className="mt-6">
              <StatusTimeline order={order} />
            </div>
          </Card>
          <Card className="p-4 md:p-6">
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="text-base font-semibold text-ink">Items</h2>
              <span className="text-sm text-subtle">
                {order.items.length} lines · {totalQuantity(order.items)} total qty
              </span>
            </div>
            <ul className="mt-4 divide-y divide-line border-t border-line">
              {order.items.map((item) =>
              <li key={item.id} className="flex items-center justify-between gap-4 py-3 text-sm">
                  <span className="text-ink">{item.name}</span>
                  <span className="whitespace-nowrap font-medium tabular-nums text-ink">
                    {item.qty} <span className="font-normal text-subtle">{item.unit}</span>
                  </span>
                </li>
              )}
            </ul>
          </Card>
        </div>

        <div className="space-y-6">
          <RouteMap order={order} />
          <Card className="p-4 md:p-6">
            <h2 className="text-base font-semibold text-ink">Order details</h2>
            <dl className="mt-4 space-y-3 text-sm">
              {details.map((d) =>
              <div key={d.term} className="flex justify-between gap-4">
                  <dt className="text-subtle">{d.term}</dt>
                  <dd className="text-right font-medium text-ink">{d.value}</dd>
                </div>
              )}
            </dl>
          </Card>
        </div>
      </div>

      <Modal
        open={contactOpen}
        onClose={() => setContactOpen(false)}
        title="Contact Dispatcher"
        description={live ? 'Contact your assigned dispatch team' : `${DISPATCHER.name} · ${DISPATCHER.hours}`}>
        
        {live ? <p className="text-sm text-subtle">Use your outlet’s dispatch contact and quote order {order.id}. In-app messaging is not available yet.</p> : <>
        <a href={`tel:${DISPATCHER.phone.replace(/\s/g, '')}`} className={buttonStyles('secondary', 'lg', true)}>
          <PhoneIcon aria-hidden="true" className="h-4 w-4" />
          Call {DISPATCHER.phone}
        </a>
        <div className="my-6 flex items-center gap-3 text-xs text-subtle">
          <span className="h-px flex-1 bg-line" />
          or send a message
          <span className="h-px flex-1 bg-line" />
        </div>
        <label htmlFor="dispatch-message" className="text-sm font-semibold text-ink">
          Message about {order.id}
        </label>
        <textarea
          id="dispatch-message"
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          aria-invalid={messageError}
          placeholder="e.g. Our rear bay is closed until 3 PM — please use the side entrance"
          className={`mt-2 w-full rounded-lg border bg-surface px-3 py-2 text-base text-ink placeholder:text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 lg:text-sm ${
          messageError ? 'border-danger' : 'border-line'}`
          } />
        
        {messageError && <p className="mt-1 text-xs font-medium text-danger-ink">Write a message before sending</p>}
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" size="lg" onClick={() => setContactOpen(false)}>
            Cancel
          </Button>
          <Button size="lg" onClick={sendMessage}>
            Send Message
          </Button>
        </div>
        </>}
      </Modal>
    </PageContainer>);

}
