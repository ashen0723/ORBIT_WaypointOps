import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CircleAlertIcon, CircleCheckIcon, CloudOffIcon, CloudUploadIcon, Loader2Icon, WifiIcon, WifiOffIcon } from 'lucide-react';
import { useSync, type OpState } from '../../contexts/SyncContext';
import { useDispatch } from '../../contexts/DispatchContext';
import { formatDateTime } from '../../utils/clock';
import { Button } from '../ui/Button';

const STATE_TEXT: Record<OpState, string> = { pending: 'Waiting to sync', syncing: 'Syncing…', synced: 'Synced', failed: 'Failed', conflict: 'Conflict' };
const STATE_STYLE: Record<OpState, string> = {
  pending: 'bg-amber-pale text-amber-ink',
  syncing: 'bg-blue/10 text-blue-ink',
  synced: 'bg-brand-pale text-forest',
  failed: 'bg-danger-pale text-danger-ink',
  conflict: 'bg-danger-pale text-danger-ink'
};

/** Connection + outbox status for field roles; a compact live indicator for everyone else. */
export function SyncStatus() {
  const { online, forcedOffline, setOffline, ops, pendingCount, problemCount, retry, discard, storageError } = useSync();
  const { user, stale, lastLoadedAt } = useDispatch();
  const field = user.role === 'loader' || user.role === 'driver';
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const label = !online ? pendingCount ? `Offline · ${pendingCount} pending` : 'Offline' : problemCount ? `${problemCount} need attention` : pendingCount ? `Syncing ${pendingCount}` : 'All synced';
  const tone = !online ? 'bg-ink text-white' : problemCount ? 'bg-danger-pale text-danger-ink' : pendingCount ? 'bg-amber-pale text-amber-ink' : 'bg-brand-pale text-forest';
  const Icon = !online ? CloudOffIcon : problemCount ? CircleAlertIcon : pendingCount ? CloudUploadIcon : CircleCheckIcon;

  if (!field) {
    return (
      <span className={`inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-xs font-semibold ${online ? 'bg-brand-pale text-forest' : 'bg-ink text-white'}`} role="status">
        {online ? <WifiIcon aria-hidden="true" className="h-3.5 w-3.5" /> : <WifiOffIcon aria-hidden="true" className="h-3.5 w-3.5" />}
        {online ? 'Live' : 'Offline — read only'}
      </span>);

  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={`inline-flex h-10 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-sm font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${tone}`}>
        
        <Icon aria-hidden="true" className="h-4 w-4" />
        <span aria-live="polite">{label}</span>
      </button>
      <AnimatePresence>
        {open &&
        <motion.div
          role="dialog"
          aria-label="Sync status"
          initial={{ opacity: 0, scale: 0.96, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
          className="absolute right-0 top-full z-40 mt-2 w-[min(92vw,380px)] origin-top-right rounded-card bg-surface p-4 shadow-pop ring-1 ring-line">
          
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-ink">{online ? 'Connected' : 'Working offline'}</p>
                <p className="text-sm text-subtle">{stale ? `Showing saved copy${lastLoadedAt ? ` from ${formatDateTime(lastLoadedAt)}` : ''}.` : 'Your actions save to this device first, then sync.'}</p>
              </div>
              <label className="flex shrink-0 cursor-pointer items-center gap-2 text-sm font-medium text-ink">
                <input type="checkbox" checked={forcedOffline} onChange={(e) => setOffline(e.target.checked)} className="h-4 w-4 accent-[#1B6B3F]" />
                Simulate offline
              </label>
            </div>
            {storageError && <p className="mt-3 rounded-2xl bg-danger-pale px-3 py-2 text-sm text-danger-ink">Offline storage unavailable: {storageError}</p>}
            {ops.length === 0 ?
          <p className="mt-4 rounded-2xl bg-canvas px-3 py-4 text-center text-sm text-subtle">No recorded actions yet.</p> :

          <ul className="mt-4 max-h-80 space-y-2 overflow-y-auto">
                {[...ops].reverse().map((op) =>
            <li key={op.opId} className="rounded-2xl border border-line p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-ink">{op.label}</p>
                      <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATE_STYLE[op.state]}`}>
                        {op.state === 'syncing' && <Loader2Icon aria-hidden="true" className="h-3 w-3 animate-spin" />}
                        {STATE_TEXT[op.state]}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-subtle">
                      Recorded {formatDateTime(op.createdAt)}
                      {op.syncedAt && ` · synced ${formatDateTime(op.syncedAt)}${op.replayed ? ' (already on server)' : ''}`}
                    </p>
                    {op.error && <p className="mt-1.5 text-sm text-danger-ink">{op.error}</p>}
                    {(op.state === 'failed' || op.state === 'conflict') &&
              <div className="mt-2 flex gap-2">
                        {op.state === 'failed' &&
                <Button size="sm" variant="secondary" onClick={() => void retry(op.opId)}>
                            Retry
                          </Button>
                }
                        <Button size="sm" variant="ghost" onClick={() => void discard(op.opId)}>
                          {op.state === 'conflict' ? 'Accept server version' : 'Discard'}
                        </Button>
                      </div>
              }
                  </li>
            )}
              </ul>
          }
          </motion.div>
        }
      </AnimatePresence>
    </div>);

}