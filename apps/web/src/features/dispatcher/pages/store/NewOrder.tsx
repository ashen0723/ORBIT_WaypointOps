import React, { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { PageContainer } from '../../components/ui/PageContainer';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useDispatch } from '../../contexts/DispatchContext';
import type { Brand, Temperature } from '../../types/dispatch';
import { earliestDeliveryDate, upcomingOperatingDays } from '../../utils/calendar';
import { formatDate } from '../../utils/clock';

const INPUT = 'mt-1.5 h-12 w-full rounded-2xl border border-line bg-surface px-4 text-base text-ink focus:outline-none focus:ring-2 focus:ring-brand';

export function NewOrder() {
  const { user, getOutlet, calendar, serverTime, run } = useDispatch();
  const navigate = useNavigate();
  const outlet = getOutlet(user.outletId ?? '');
  const depotId = outlet?.depotId ?? 'DEP-PLG';
  const dates = upcomingOperatingDays(calendar, depotId, earliestDeliveryDate(calendar, depotId, serverTime), 10);

  const [brand, setBrand] = useState<Brand>('Fresh');
  const [temperature, setTemperature] = useState<Temperature>('ambient');
  const [date, setDate] = useState('');
  const [units, setUnits] = useState('');
  const [weight, setWeight] = useState('');
  const [volume, setVolume] = useState('');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrors([]);
    const res = await run<{orderId: string;}>(
      { op: 'createOrder', input: { brand, temperature, requestedDate: date || dates[0], units: Number(units), weightKg: Number(weight), volumeM3: Number(volume), note } },
      { quiet: true }
    );
    setBusy(false);
    if (!res.ok) {
      setErrors(res.details.length ? res.details : [res.message]);
      return;
    }
    toast.success(`Order ${res.data.orderId} placed`);
    navigate(`/store/orders/${res.data.orderId}`);
  };

  return (
    <PageContainer className="max-w-[720px]">
      <PageHeader backTo={{ to: '/store', label: 'My Orders' }} title="New Order" subtitle={outlet ? `${outlet.name} · receiving ${outlet.windowStart}–${outlet.windowEnd}` : undefined} />
      <Card className="mt-6 p-5 md:p-8">
        <form onSubmit={(e) => void submit(e)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold text-ink">Brand</span>
              <select value={brand} onChange={(e) => setBrand(e.target.value as Brand)} className={INPUT}>
                <option>Fresh</option>
                <option>Style</option>
                <option>Tech</option>
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-ink">Storage</span>
              <select value={temperature} onChange={(e) => setTemperature(e.target.value as Temperature)} className={INPUT}>
                <option value="ambient">Ambient</option>
                <option value="chilled">Chilled</option>
                <option value="frozen">Frozen</option>
              </select>
            </label>
          </div>
          <label className="block">
            <span className="text-sm font-semibold text-ink">Delivery date</span>
            <select value={date || dates[0] || ''} onChange={(e) => setDate(e.target.value)} className={INPUT}>
              {dates.map((d) =>
              <option key={d} value={d}>
                  {formatDate(d, 'long')}
                </option>
              )}
            </select>
            <span className="mt-1 block text-xs text-subtle">Orders after 4 PM Colombo time move to the next operating day.</span>
          </label>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block">
              <span className="text-sm font-semibold text-ink">Units</span>
              <input type="number" min={1} step={1} required value={units} onChange={(e) => setUnits(e.target.value)} className={INPUT} />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-ink">Weight (kg)</span>
              <input type="number" min={0.1} step={0.1} required value={weight} onChange={(e) => setWeight(e.target.value)} className={INPUT} />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-ink">Volume (m³)</span>
              <input type="number" min={0.01} step={0.01} required value={volume} onChange={(e) => setVolume(e.target.value)} className={INPUT} />
            </label>
          </div>
          <label className="block">
            <span className="text-sm font-semibold text-ink">Note (optional)</span>
            <input value={note} onChange={(e) => setNote(e.target.value)} className={INPUT} />
          </label>
          {errors.length > 0 &&
          <ul role="alert" className="space-y-1 rounded-2xl bg-danger-pale px-4 py-3 text-sm text-danger-ink">
              {errors.map((er) =>
            <li key={er}>• {er}</li>
            )}
            </ul>
          }
          <Button type="submit" size="lg" fullWidth disabled={busy || dates.length === 0}>
            {busy ? 'Placing…' : 'Place Order'}
          </Button>
        </form>
      </Card>
    </PageContainer>);

}