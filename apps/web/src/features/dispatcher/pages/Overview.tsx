import React from 'react';
import { CircleCheckIcon } from 'lucide-react';
import { PageContainer } from '../components/ui/PageContainer';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { StatCard } from '../components/dispatch/StatCard';
import { FeaturedAction } from '../components/overview/FeaturedAction';
import { ActionRow } from '../components/overview/ActionRow';
import { WorkflowBar } from '../components/workflow/WorkflowBar';
import { useDispatch } from '../contexts/DispatchContext';
import { useActionItems } from '../hooks/useActionItems';
import { REPEAT_DEFERRAL_THRESHOLD } from '../data/rules';
import { colomboParts, formatDate } from '../utils/clock';
import { hasOpenDelay, tripLoadingState, vehicleState } from '../utils/status';
import { plural } from '../utils/format';

export function Overview() {
  const { orders, trips, vehicles, serverTime } = useDispatch();
  const actions = useActionItems();
  const [first, ...rest] = actions;
  const today = colomboParts(serverTime).date;

  const loading = trips.filter((t) => t.status === 'loading');
  const onRoad = trips.filter((t) => t.status === 'on_road');
  const delayed = onRoad.filter((t) => t.stops.some(hasOpenDelay)).length;
  const exceptions = loading.filter((t) => tripLoadingState(t) === 'exception').length;
  const repeat = orders.filter((o) => o.status === 'pending' && o.deferralCount >= REPEAT_DEFERRAL_THRESHOLD).length;

  const stats = [
  { label: 'Orders Waiting', value: orders.filter((o) => o.status === 'pending').length, hint: 'Need a trip', to: '/orders' },
  { label: 'Trips Loading', value: loading.length, hint: `${loading.filter((t) => tripLoadingState(t) === 'ready').length} ready to depart`, to: '/loading' },
  { label: 'Vehicles Free Today', value: vehicles.filter((v) => vehicleState(v, trips, today) === 'available').length, hint: `of ${vehicles.length} vehicles`, to: '/vehicles' },
  { label: 'Loading Exceptions', value: exceptions, hint: exceptions ? 'Need acknowledgement' : 'None', to: '/loading', alert: exceptions > 0 },
  { label: 'On the Road', value: onRoad.length, hint: delayed ? `${delayed} delayed` : 'All on schedule', to: '/monitoring', alert: delayed > 0 },
  { label: 'Deferred 2+ times', value: repeat, hint: 'Planned first', to: '/deferrals', alert: repeat > 0 }];


  return (
    <PageContainer className="max-w-[1400px]">
      <PageHeader title="Dispatcher Overview" subtitle={<>{formatDate(today, 'long')} · Peliyagoda & Kandy</>} />

      <section aria-label="At a glance" className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:gap-4 xl:grid-cols-6">
        {stats.map((s) =>
        <StatCard key={s.label} {...s} />
        )}
      </section>

      <section aria-labelledby="actions-title" className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 id="actions-title" className="text-xl font-semibold text-ink md:text-2xl">
            Action Required
          </h2>
          {actions.length > 0 && <p className="text-sm text-subtle">{plural(actions.length, 'task')} · most urgent first</p>}
        </div>

        {!first ?
        <Card className="mt-4 flex items-center gap-3 p-6 text-forest">
            <CircleCheckIcon aria-hidden="true" className="h-6 w-6" />
            <p className="font-semibold">All caught up. Nothing needs you right now.</p>
          </Card> :

        <div className={`mt-4 grid items-stretch gap-4 lg:gap-6 ${rest.length ? 'lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]' : ''}`}>
            <FeaturedAction item={first} />
            {rest.length > 0 &&
          <Card>
                <h3 className="px-4 pt-4 text-sm font-semibold text-subtle md:px-5 md:pt-5">Then</h3>
                <ul className="divide-y divide-line">
                  {rest.map((item) =>
              <ActionRow key={item.id} item={item} />
              )}
                </ul>
              </Card>
          }
          </div>
        }
      </section>

      <section aria-labelledby="flow-title" className="mt-10">
        <h2 id="flow-title" className="text-sm font-semibold text-ink">
          How a delivery moves
        </h2>
        <WorkflowBar className="mt-3" />
        <p className="mt-4 text-sm text-subtle">If an order can’t be delivered:</p>
        <WorkflowBar variant="defer" className="mt-2" />
      </section>
    </PageContainer>);

}