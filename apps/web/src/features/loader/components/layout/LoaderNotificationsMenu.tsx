import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { BellIcon, RefreshCwIcon, TriangleAlertIcon } from 'lucide-react';
import { useLoader } from '../../contexts/LoaderContext';

export function LoaderNotificationsMenu() {
  const { issues, reviewedPlanVehicleIds } = useLoader();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const issueNotes = Object.values(issues).map((issue) => ({
    id: `issue-${issue.itemId}`,
    Icon: TriangleAlertIcon,
    tone: issue.decisionReceived ? 'bg-brand-pale text-forest' : 'bg-amber-pale text-amber-ink',
    title: issue.decisionReceived ? 'Decision received' : 'Shortfall reported',
    body: issue.decisionReceived ? `${issue.orderId} · ${issue.itemName} may proceed.` : `${issue.orderId} · ${issue.itemName} is waiting for Dispatcher review.`,
    to: `/loader/veh014/issue/${issue.itemId}`
  }));
  const notes = [
  ...(!reviewedPlanVehicleIds.includes('VEH031') ? [{ id: 'plan', Icon: RefreshCwIcon, tone: 'bg-amber-pale text-amber-ink', title: 'Plan updated', body: 'VEH031 stop sequence changed 2 min ago.', to: '/loader/veh031/stops/updated' }] : []),
  ...issueNotes];


  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);};
    const onKey = (event: KeyboardEvent) => {if (event.key === 'Escape') setOpen(false);};
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {document.removeEventListener('mousedown', onDown);document.removeEventListener('keydown', onKey);};
  }, [open]);

  return <div ref={ref} className="relative"><button type="button" onClick={() => setOpen((current) => !current)} aria-expanded={open} aria-haspopup="true" aria-label={`Notifications, ${notes.length} new`} className="relative grid h-10 w-10 place-items-center rounded-full text-ink transition-colors duration-150 hover:bg-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand md:h-11 md:w-11 md:bg-surface md:hover:bg-brand-pale"><BellIcon className="h-5 w-5" />{notes.length > 0 && <span className="absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-amber px-1 text-[10px] font-bold text-amber-ink">{notes.length}</span>}</button><AnimatePresence>{open && <motion.div initial={{ opacity: 0, y: -4, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4, scale: 0.98 }} transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }} className="absolute right-0 top-14 z-40 w-[min(360px,calc(100vw-2rem))] origin-top-right overflow-hidden rounded-card bg-surface shadow-pop ring-1 ring-line"><p className="border-b border-line px-4 py-3 text-sm font-semibold text-ink">Loader updates</p><ul className="divide-y divide-line">{notes.map(({ id, Icon, tone, title, body, to }) => <li key={id}><Link to={to} onClick={() => setOpen(false)} className="flex gap-3 px-4 py-3 transition-colors duration-150 hover:bg-canvas focus-visible:bg-canvas focus-visible:outline-none"><span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${tone}`}><Icon aria-hidden="true" className="h-4 w-4" /></span><span className="min-w-0"><span className="block text-sm font-semibold text-ink">{title}</span><span className="block text-sm text-subtle">{body}</span></span></Link></li>)}</ul></motion.div>}</AnimatePresence></div>;
}