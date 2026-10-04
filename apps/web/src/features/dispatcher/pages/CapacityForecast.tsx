import React, { useState } from 'react';
import { CircleCheckIcon, TriangleAlertIcon } from 'lucide-react';
import { PageContainer } from '../components/ui/PageContainer';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { forecastDays } from '../data/forecast';
import { ORDER_CUTOFF } from '../data/dispatcher';
import { plural } from '../utils/format';
import { to12h } from '../utils/time';

export function CapacityForecast() {
  const [dayId, setDayId] = useState(forecastDays[0].id);
  const day = forecastDays.find((d) => d.id === dayId) ?? forecastDays[0];

  const orders = day.breakdown.reduce((s, b) => s + b.orders, 0);
  const capacity = day.breakdown.reduce((s, b) => s + b.capacity, 0);
  const shortage = Math.max(0, orders - capacity);
  const whose = day.id === 'tomorrow' ? 'tomorrow’s orders' : `orders on ${day.date}`;

  return (
    <PageContainer className="max-w-[1200px]">
      <PageHeader
        title="Capacity Forecast"
        subtitle="Can the available fleet handle upcoming orders?"
        actions={
        <div className="w-full sm:w-96">
            <SegmentedControl label="Day" value={dayId} onChange={setDayId} options={forecastDays.map((d) => ({ value: d.id, label: d.label }))} />
          </div>
        } />
      

      {shortage > 0 ?
      <div role="alert" className="mt-6 flex gap-4 rounded-card bg-amber-pale p-5 shadow-card md:p-6">
          <TriangleAlertIcon aria-hidden="true" className="mt-0.5 h-6 w-6 shrink-0 text-amber-ink" />
          <div>
            <h2 className="text-xl font-semibold text-amber-ink">Potential Capacity Shortage</h2>
            <p className="mt-1 text-ink">Available vehicle capacity may not be enough for {whose}.</p>
          </div>
        </div> :

      <div className="mt-6 flex gap-4 rounded-card bg-brand-pale p-5 shadow-card md:p-6">
          <CircleCheckIcon aria-hidden="true" className="mt-0.5 h-6 w-6 shrink-0 text-forest" />
          <div>
            <h2 className="text-xl font-semibold text-forest">Capacity looks sufficient</h2>
            <p className="mt-1 text-ink">The available fleet can carry all {whose}.</p>
          </div>
        </div>
      }

      <Card className="mt-6 p-5 md:p-6">
        <p className="text-sm text-subtle">
          {day.label}
          {day.id === 'tomorrow' && ` · ${day.date}`}
        </p>
        <dl className="mt-4 grid gap-6 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-line">
          <div className="sm:pr-6">
            <dt className="text-sm font-semibold text-ink">Upcoming Orders</dt>
            <dd className="mt-2 text-4xl font-semibold leading-none tabular-nums text-ink">{orders}</dd>
          </div>
          <div className="sm:px-6">
            <dt className="text-sm font-semibold text-ink">Available Vehicle Capacity</dt>
            <dd className="mt-2 text-4xl font-semibold leading-none tabular-nums text-ink">
              {capacity} <span className="text-base font-medium text-subtle">orders</span>
            </dd>
          </div>
          <div className="sm:pl-6">
            <dt className="text-sm font-semibold text-ink">Expected Capacity Shortage</dt>
            <dd className={`mt-2 text-4xl font-semibold leading-none tabular-nums ${shortage > 0 ? 'text-danger-ink' : 'text-forest'}`}>
              {shortage} <span className="text-base font-medium text-subtle">orders</span>
            </dd>
          </div>
        </dl>
      </Card>

      <Card className="mt-6">
        <div className="border-b border-line px-4 py-4 md:px-6">
          <h2 className="text-lg font-semibold text-ink">By brand</h2>
          <p className="text-sm text-subtle">Orders vs. what the matching vehicles can carry</p>
        </div>
        <ul className="divide-y divide-line">
          {day.breakdown.map((b) => {
            const short = Math.max(0, b.orders - b.capacity);
            const covered = Math.min(b.orders, b.capacity);
            return (
              <li key={b.brand} className="grid grid-cols-[5rem_minmax(0,1fr)] items-center gap-x-4 gap-y-2 px-4 py-4 md:grid-cols-[6rem_minmax(0,1fr)_14rem] md:px-6">
                <p className="font-semibold text-ink">{b.brand}</p>
                <div className="flex h-3 overflow-hidden rounded-full bg-canvas" role="img" aria-label={`${covered} of ${b.orders} orders covered`}>
                  <span className="h-full bg-brand" style={{ width: `${covered / b.orders * 100}%` }} />
                  {short > 0 && <span className="h-full bg-danger" style={{ width: `${short / b.orders * 100}%` }} />}
                </div>
                <p className="col-start-2 text-sm tabular-nums text-subtle md:col-start-auto md:text-right">
                  <span className="font-semibold text-ink">{b.orders}</span> orders · {b.capacity} capacity ·{' '}
                  <span className={`font-semibold ${short > 0 ? 'text-danger-ink' : 'text-forest'}`}>{short > 0 ? `${short} short` : 'OK'}</span>
                </p>
              </li>);

          })}
        </ul>
      </Card>

      <p className="mt-4 text-sm text-subtle">
        Based on {plural(orders, 'order')} received before the {to12h(ORDER_CUTOFF)} cutoff and vehicles available that day.
      </p>
    </PageContainer>);

}