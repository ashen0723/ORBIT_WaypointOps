import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { Order } from '../../types/orders';
import { Card } from '../ui/Card';
import { buttonStyles } from '../ui/Button';
import { formatClock, formatTime24, toMinutes } from '../../utils/time';
import { formatDate, relativeDay } from '../../utils/format';
import { NOW_MINUTES } from '../../data/schedule';

const REFRESH_EVERY = 30;

export function EtaCard({ order }: {order: Order;}) {
  const [tick, setTick] = useState(0);
  const live = order.status === 'in_transit' || order.status === 'loading';

  useEffect(() => {
    if (!live) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [live]);

  const since = tick % REFRESH_EVERY;
  const refreshes = Math.floor(tick / REFRESH_EVERY);

  if (order.status === 'deferred' && order.deferral) {
    return (
      <Card className="border-l-4 border-amber p-4 md:p-6">
        <p className="text-sm font-medium text-amber-ink">Delivery deferred to the next run</p>
        <p className="mt-2 text-[32px] font-semibold leading-none text-ink lg:text-[40px]">{formatDate(order.deferral.newDate)}</p>
        <p className="mt-2 text-sm text-subtle">Originally requested for {formatDate(order.deferral.originalDate)}</p>
        <Link to={`/orders/${order.id}/deferral`} className={`${buttonStyles('secondary', 'md')} mt-4`}>
          View deferral notice
        </Link>
      </Card>);

  }

  if ((order.status === 'delivered' || order.status === 'receipt_confirmed') && order.deliveredAt) {
    const confirmed = order.status === 'receipt_confirmed' || order.receiptConfirmed;
    return (
      <Card className="p-4 md:p-6">
        <p className="text-sm font-medium text-subtle">Delivered</p>
        <p className="mt-2 text-[40px] font-semibold leading-none tabular-nums text-ink lg:text-5xl">{formatTime24(order.deliveredAt)}</p>
        <p className="mt-2 text-sm text-subtle">
          {relativeDay(order.requestedDate)}
          {order.eta && ` · expected ${formatTime24(order.eta)}`}
          {confirmed ? ' · receipt confirmed' : ' · waiting for your receipt check'}
        </p>
        {!confirmed &&
        <Link to={`/orders/${order.id}/receipt`} className={`${buttonStyles('primary', 'md')} mt-4`}>
            Confirm receipt
          </Link>
        }
      </Card>);

  }

  if (!order.eta) {
    return (
      <Card className="p-4 md:p-6">
        <p className="text-sm font-medium text-subtle">Expected arrival</p>
        <p className="mt-2 text-[32px] font-semibold leading-none text-ink lg:text-[40px]">Not planned yet</p>
        <p className="mt-2 text-sm text-subtle">
          The dispatcher plans routes by 8:00 PM the day before delivery. Requested for {formatDate(order.requestedDate)}.
        </p>
      </Card>);

  }

  const etaMinutes = toMinutes(order.eta) + (refreshes % 3 === 1 ? 2 : 0);
  const away = order.requestedDate === '2026-09-28' ? Math.max(1, etaMinutes - NOW_MINUTES - Math.floor(tick / 60)) : null;

  return (
    <Card className="p-4 md:p-6">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-medium text-subtle">Expected arrival</p>
        {live &&
        <p className="flex items-center gap-2 text-xs text-subtle" aria-live="polite">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-brand-mint opacity-75 motion-safe:animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-medium" />
            </span>
            {since < 3 ? 'Updated just now' : `Updated ${since}s ago`}
          </p>
        }
      </div>
      <motion.p
        key={etaMinutes}
        initial={{ opacity: 0.4 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
        className="mt-2 text-[40px] font-semibold leading-none tabular-nums text-ink lg:text-5xl">
        
        {formatClock(etaMinutes)}
      </motion.p>
      <p className="mt-2 text-sm text-subtle">
        {relativeDay(order.requestedDate)}
        {away !== null && live && ` · about ${away} min away`}
        {order.status === 'planned' && ' · planned by dispatcher, goes live when loading starts'}
      </p>
    </Card>);

}
