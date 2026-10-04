import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { BellIcon, ClockIcon, PackageCheckIcon, TriangleAlertIcon, TruckIcon } from 'lucide-react';
import { useOrders } from '../../contexts/OrdersContext';
import { formatDate } from '../../utils/format';
import { formatTime24 } from '../../utils/time';

export function NotificationsMenu() {
  const { orders } = useOrders();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const notes = orders.flatMap((o) => {
    if (o.status === 'deferred' && o.deferral)
    return [{ id: o.id, Icon: TriangleAlertIcon, tone: 'bg-amber-pale text-amber-ink', title: `${o.id} deferred`, body: `Moved to ${formatDate(o.deferral.newDate)}`, to: `/orders/${o.id}/deferral` }];
    if (o.status === 'delivered' && o.deliveredAt)
    return [{ id: o.id, Icon: PackageCheckIcon, tone: 'bg-brand-pale text-forest', title: `${o.id} delivered`, body: `Arrived ${formatTime24(o.deliveredAt)} — confirm receipt`, to: `/orders/${o.id}/receipt` }];
    if (o.status === 'in_transit' && o.eta)
    return [{ id: o.id, Icon: TruckIcon, tone: 'bg-brand-mint/30 text-forest', title: `${o.id} is on the way`, body: `Expected ${formatTime24(o.eta)}`, to: `/orders/${o.id}` }];
    if (o.status === 'placed')
    return [{ id: o.id, Icon: ClockIcon, tone: 'bg-canvas text-subtle', title: `${o.id} awaiting confirmation`, body: 'Dispatch usually confirms within 1 hour', to: `/orders/${o.id}` }];
    return [];
  });

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={`Notifications, ${notes.length} new`}
        className="relative grid h-10 w-10 place-items-center rounded-full text-ink transition-colors duration-150 hover:bg-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand md:h-11 md:w-11 md:bg-surface md:hover:bg-brand-pale">
        
        <BellIcon className="h-5 w-5" />
        {notes.length > 0 &&
        <span className="absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
            {notes.length}
          </span>
        }
      </button>
      <AnimatePresence>
        {open &&
        <motion.div
          initial={{ opacity: 0, y: -4, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4, scale: 0.98 }}
          transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
          className="absolute right-0 top-14 z-40 w-[min(360px,calc(100vw-2rem))] origin-top-right overflow-hidden rounded-card bg-surface shadow-pop ring-1 ring-line">
          
            <p className="border-b border-line px-4 py-3 text-sm font-semibold text-ink">Notifications</p>
            <ul className="max-h-[360px] divide-y divide-line overflow-y-auto">
              {notes.map(({ id, Icon, tone, title, body, to }) =>
            <li key={id}>
                  <Link to={to} onClick={() => setOpen(false)} className="flex gap-3 px-4 py-3 transition-colors duration-150 hover:bg-canvas focus-visible:bg-canvas focus-visible:outline-none">
                    <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${tone}`}>
                      <Icon aria-hidden="true" className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-ink">{title}</span>
                      <span className="block text-sm text-subtle">{body}</span>
                    </span>
                  </Link>
                </li>
            )}
            </ul>
          </motion.div>
        }
      </AnimatePresence>
    </div>);

}