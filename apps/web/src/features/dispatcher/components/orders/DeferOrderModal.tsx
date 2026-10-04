import React, { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useDispatch } from '../../contexts/DispatchContext';
import { deferralReasons } from '../../data/deferrals';
import type { DeferralReason } from '../../types/dispatch';
import { earliestDeliveryDate, laterOf, nextOperatingDay, upcomingOperatingDays } from '../../utils/calendar';
import { formatDate } from '../../utils/clock';
import { outletLabel } from '../../utils/format';

interface DeferOrderModalProps {
  orderId: string | null;
  onClose: () => void;
  defaultReason?: DeferralReason;
}

export function DeferOrderModal({ orderId, onClose, defaultReason }: DeferOrderModalProps) {
  const { getOrder, getOutlet, calendar, serverTime, run } = useDispatch();
  const navigate = useNavigate();
  const order = orderId ? getOrder(orderId) : undefined;
  const [reason, setReason] = useState<DeferralReason | null>(defaultReason ?? null);
  const [note, setNote] = useState('');
  const [toDate, setToDate] = useState('');
  const [busy, setBusy] = useState(false);

  const earliest = order ? laterOf(nextOperatingDay(calendar, order.depotId, order.plannedDate), earliestDeliveryDate(calendar, order.depotId, serverTime)) : '';
  const options = order ? upcomingOperatingDays(calendar, order.depotId, earliest, 8) : [];

  useEffect(() => {
    if (orderId) {
      setReason(defaultReason ?? null);
      setNote('');
      setToDate('');
    }
  }, [orderId, defaultReason]);

  const date = toDate || options[0] || '';
  const needsNote = reason === 'other';
  const canSubmit = reason !== null && Boolean(date) && (!needsNote || note.trim().length > 0) && !busy;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!order || !reason || !canSubmit) return;
    setBusy(true);
    const res = await run({ op: 'deferOrder', orderId: order.id, reason, note, toDate: date });
    setBusy(false);
    if (!res.ok) return;
    toast.success('Order deferred', {
      description: `${order.id} moves to ${formatDate(date)}. The store can see the reason.`,
      action: { label: 'View', onClick: () => navigate('/deferrals') }
    });
    onClose();
  };

  return (
    <Modal open={Boolean(order)} title="Defer Order" description={order ? `${order.id} · ${outletLabel(getOutlet(order.outletId))} · planned ${formatDate(order.plannedDate)}` : undefined} onClose={onClose}>
      <form onSubmit={(e) => void submit(e)} className="space-y-5">
        <fieldset>
          <legend className="text-sm font-semibold text-ink">Why can’t it go as planned?</legend>
          <div className="mt-3 space-y-2">
            {deferralReasons.map((r) => {
              const checked = reason === r.value;
              return (
                <label
                  key={r.value}
                  className={`flex h-12 cursor-pointer items-center gap-3 rounded-2xl border px-4 text-sm font-medium transition-colors duration-150 ${checked ? 'border-brand bg-brand-pale text-forest' : 'border-line text-ink hover:bg-canvas'}`}>
                  
                  <input type="radio" name="reason" value={r.value} checked={checked} onChange={() => setReason(r.value)} className="h-4 w-4 accent-[#1B6B3F]" />
                  {r.label}
                </label>);

            })}
          </div>
        </fieldset>
        <label className="block">
          <span className="text-sm font-semibold text-ink">{needsNote ? 'Tell us more' : 'Note for the store (optional)'}</span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="e.g. Store closed for stocktake"
            className="mt-2 w-full resize-none rounded-2xl border border-line bg-surface px-4 py-3 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand" />
          
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-ink">New delivery date</span>
          <select value={date} onChange={(e) => setToDate(e.target.value)} className="mt-2 h-12 w-full rounded-2xl border border-line bg-surface px-4 text-sm font-medium text-ink focus:outline-none focus:ring-2 focus:ring-brand">
            {options.map((d) =>
            <option key={d} value={d}>
                {formatDate(d, 'long')}
              </option>
            )}
          </select>
          <span className="mt-1 block text-xs text-subtle">Only operating days after the cutoff are offered.</span>
        </label>
        <p className="rounded-2xl bg-canvas px-4 py-3 text-sm text-subtle">
          <span className="font-semibold text-ink">What happens next:</span> it leaves its current trip, goes back into the planning queue on the new date, and the event is kept in its history.
        </p>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" size="lg" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" size="lg" disabled={!canSubmit}>
            {busy ? 'Deferring…' : 'Confirm Deferral'}
          </Button>
        </div>
      </form>
    </Modal>);

}