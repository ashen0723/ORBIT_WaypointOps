import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { CheckIcon, CopyIcon } from 'lucide-react';
import { useOrders } from '../contexts/OrdersContext';
import { PageContainer } from '../components/ui/PageContainer';
import { Card } from '../components/ui/Card';
import { buttonStyles } from '../components/ui/Button';
import { BrandTag } from '../components/orders/BrandTag';
import { ChilledTag } from '../components/orders/ChilledTag';
import { OrderNotFound } from '../components/orders/OrderNotFound';
import { CUTOFF_LABEL, NEXT_DELIVERY } from '../data/schedule';
import { formatDate, formatDateLong } from '../utils/format';
import { totalQuantity } from '../utils/orders';

export function OrderConfirmation() {
  const { orderId } = useParams();
  const { getOrder } = useOrders();
  const reduce = useReducedMotion();
  const [copied, setCopied] = useState(false);
  const order = getOrder(orderId);

  if (!order) return <OrderNotFound />;

  const handleCopy = () => {
    navigator.clipboard?.writeText(order.id).catch(() => undefined);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  const steps = [
  { title: 'Confirmed', body: 'Received by Waypoint dispatch', time: 'Just now', done: true },
  { title: 'Planned by dispatcher', body: 'Assigned to a vehicle and route — an ETA appears then', time: 'By 8:00 PM', done: false },
  { title: 'Out for delivery', body: NEXT_DELIVERY[order.brand].note, time: formatDate(order.requestedDate), done: false }];


  return (
    <PageContainer className="flex justify-center">
      <Card className="w-full max-w-[480px] p-6 md:p-8">
        <div className="text-center">
          <motion.div
            initial={reduce ? false : { opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
            className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-brand text-white">
            
            <CheckIcon aria-hidden="true" className="h-7 w-7" strokeWidth={3} />
          </motion.div>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-ink lg:text-[32px] lg:leading-tight">Order Confirmed</h1>
          <p className="mt-4 text-xs font-medium text-subtle">Order ID</p>
          <div className="mt-1 flex items-center justify-center gap-2">
            <p className="text-[28px] font-semibold tabular-nums tracking-tight text-ink">{order.id}</p>
            <button
              type="button"
              onClick={handleCopy}
              aria-label={copied ? 'Order ID copied' : 'Copy order ID'}
              className="grid h-9 w-9 place-items-center rounded-lg text-subtle transition-colors duration-150 hover:bg-canvas hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
              
              {copied ? <CheckIcon className="h-4 w-4 text-brand-medium" /> : <CopyIcon className="h-4 w-4" />}
            </button>
          </div>
          <p className="mt-2 text-subtle">
            Received and scheduled for <span className="font-semibold text-ink">{formatDateLong(order.requestedDate)}</span>
          </p>
        </div>

        <dl className="mt-6 divide-y divide-line rounded-lg border border-line text-sm">
          <div className="flex items-center justify-between gap-4 px-4 py-3">
            <dt className="text-subtle">Brand</dt>
            <dd className="flex gap-2">
              <BrandTag brand={order.brand} />
              {order.type === 'chilled' && <ChilledTag />}
            </dd>
          </div>
          <div className="flex justify-between gap-4 px-4 py-3">
            <dt className="text-subtle">Items</dt>
            <dd className="font-medium text-ink">
              {order.items.length} lines · {totalQuantity(order.items)} total qty
            </dd>
          </div>
          <div className="flex justify-between gap-4 px-4 py-3">
            <dt className="text-subtle">Requested delivery</dt>
            <dd className="font-medium text-ink">{formatDate(order.requestedDate)}</dd>
          </div>
          <div className="flex justify-between gap-4 px-4 py-3">
            <dt className="text-subtle">Submitted</dt>
            <dd className="text-right font-medium text-ink">
              {order.submittedAt}
              <span className="block text-xs font-normal text-subtle">Before the {CUTOFF_LABEL} cutoff</span>
            </dd>
          </div>
        </dl>

        <section aria-labelledby="next-heading" className="mt-6">
          <h2 id="next-heading" className="text-sm font-semibold text-ink">
            What happens next
          </h2>
          <ol className="mt-4">
            {steps.map((step, i) =>
            <li key={step.title} className="relative flex gap-3 pb-4 last:pb-0">
                {i < steps.length - 1 && <span aria-hidden="true" className="absolute left-[11px] top-7 h-[calc(100%-28px)] w-0.5 bg-line" />}
                <span
                aria-hidden="true"
                className={`relative z-10 grid h-6 w-6 shrink-0 place-items-center rounded-full ${step.done ? 'bg-brand text-white' : 'border-2 border-line bg-surface'}`}>
                
                  {step.done && <CheckIcon className="h-3.5 w-3.5" strokeWidth={3} />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-4">
                    <p className="text-sm font-semibold text-ink">{step.title}</p>
                    <p className="shrink-0 text-xs text-subtle">{step.time}</p>
                  </div>
                  <p className="text-sm text-subtle">{step.body}</p>
                </div>
              </li>
            )}
          </ol>
        </section>

        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row">
          <Link to={`/orders/${order.id}`} className={`${buttonStyles('secondary', 'lg')} flex-1`}>
            View Order
          </Link>
          <Link to="/" className={`${buttonStyles('primary', 'lg')} flex-1`}>
            Back to Orders
          </Link>
        </div>
      </Card>
    </PageContainer>);

}