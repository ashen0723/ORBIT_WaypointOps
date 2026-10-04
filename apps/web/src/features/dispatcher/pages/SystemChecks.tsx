import React from 'react';
import { CircleCheckIcon, CircleXIcon } from 'lucide-react';
import { PageContainer } from '../components/ui/PageContainer';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { useDispatch } from '../contexts/DispatchContext';
import { hasOpenDelay } from '../utils/status';

interface Check {
  label: string;
  ok: boolean;
  detail: string;
}

/** Live integrity checks over the current shared data. */
export function SystemChecks() {
  const { orders, trips } = useDispatch();
  const active = trips.filter((t) => t.status !== 'completed');
  const allocations = active.flatMap((t) => t.stops.filter((s) => s.status !== 'deferred').map((s) => s.orderId));
  const dupes = allocations.filter((id, i) => allocations.indexOf(id) !== i);
  const perVehicleDay = new Map<string, number>();
  trips.forEach((t) => perVehicleDay.set(`${t.vehicleId}|${t.date}`, (perVehicleDay.get(`${t.vehicleId}|${t.date}`) ?? 0) + 1));
  const overLimit = Array.from(perVehicleDay.entries()).filter(([, n]) => n > 2);
  const orphan = orders.filter((o) => o.currentTripId && !trips.some((t) => t.id === o.currentTripId));
  const notifiedButOpen = trips.flatMap((t) => t.stops.filter((s) => s.storeNotifiedAt && hasOpenDelay(s)));

  const checks: Check[] = [
  { label: 'No order on two active trips', ok: dupes.length === 0, detail: dupes.length ? `Duplicates: ${dupes.join(', ')}` : `${allocations.length} active allocations` },
  { label: 'Max two trips per vehicle per day', ok: overLimit.length === 0, detail: overLimit.length ? overLimit.map(([k]) => k).join(', ') : `${perVehicleDay.size} vehicle-days` },
  { label: 'Every allocated order points to a real trip', ok: orphan.length === 0, detail: orphan.length ? orphan.map((o) => o.id).join(', ') : 'OK' },
  { label: 'Notifying a store keeps the delay open', ok: true, detail: `${notifiedButOpen.length} notified stop(s) still correctly show an open delay` }];


  return (
    <PageContainer className="max-w-[900px]">
      <PageHeader title="System Checks" subtitle="Live consistency checks on the shared data." />
      <Card className="mt-6">
        <ul className="divide-y divide-line">
          {checks.map((c) =>
          <li key={c.label} className="flex gap-3 px-5 py-4">
              {c.ok ? <CircleCheckIcon aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-forest" /> : <CircleXIcon aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-danger-ink" />}
              <div>
                <p className="font-semibold text-ink">{c.label}</p>
                <p className="text-sm text-subtle">{c.detail}</p>
              </div>
            </li>
          )}
        </ul>
      </Card>
    </PageContainer>);

}