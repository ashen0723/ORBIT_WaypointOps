import React, { FormEvent, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useDispatch } from '../../contexts/DispatchContext';
import { RESCHEDULE_DATES } from '../../data/dispatcher';

interface RescheduleModalProps {
  orderId: string | null;
  onClose: () => void;
}

export function RescheduleModal({ orderId, onClose }: RescheduleModalProps) {
  const { deferrals, reschedule } = useDispatch();
  const record = orderId ? deferrals.find((d) => d.orderId === orderId) : undefined;
  const [date, setDate] = useState('');

  useEffect(() => {
    if (record) setDate(record.nextDate);
  }, [record?.orderId]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!record) return;
    reschedule(record.orderId, date);
    toast.success('Order rescheduled', { description: `${record.orderId} is planned for ${date}.` });
    onClose();
  };

  return (
    <Modal open={Boolean(record)} title={record ? `Reschedule ${record.orderId}` : 'Reschedule'} description="When should we try this delivery again?" onClose={onClose}>
      <form onSubmit={submit} className="space-y-5">
        <fieldset>
          <legend className="sr-only">New delivery date</legend>
          <div className="grid grid-cols-2 gap-2">
            {RESCHEDULE_DATES.map((d) => {
              const checked = date === d;
              return (
                <label
                  key={d}
                  className={`flex h-12 cursor-pointer items-center gap-3 rounded-2xl border px-4 text-sm font-semibold transition-colors duration-150 ${checked ? 'border-brand bg-brand-pale text-forest' : 'border-line text-ink hover:bg-canvas'}`}>
                  
                  <input type="radio" name="date" value={d} checked={checked} onChange={() => setDate(d)} className="h-4 w-4 accent-[#1B6B3F]" />
                  {d}
                </label>);

            })}
          </div>
        </fieldset>
        <p className="rounded-2xl bg-canvas px-4 py-3 text-sm text-subtle">
          <span className="font-semibold text-ink">What happens next:</span> the order stays in Deferred Orders until that day, then goes back to Orders.
        </p>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" size="lg" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" size="lg" disabled={!date}>
            Confirm Reschedule
          </Button>
        </div>
      </form>
    </Modal>);

}