import React from 'react';
import { Link } from 'react-router-dom';
import { PageContainer } from '../components/ui/PageContainer';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { buttonStyles } from '../components/ui/Button';
import { WorkflowBar } from '../components/workflow/WorkflowBar';
import { LoadingTripCard } from '../components/loading/LoadingTripCard';
import { useDispatch } from '../contexts/DispatchContext';
import { formatDate } from '../utils/clock';
import { toMin } from '../utils/time';
import { tripLoadingState } from '../utils/status';

export function Loading() {
  const { trips, user, getDepot } = useDispatch();
  const loader = user.role === 'loader';
  const loading = trips.filter((t) => t.status === 'loading').sort((a, b) => a.date.localeCompare(b.date) || toMin(a.departAt) - toMin(b.departAt));
  const dates = Array.from(new Set(loading.map((t) => t.date)));
  const attention = loading.filter((t) => tripLoadingState(t) === 'exception').length;

  return (
    <PageContainer className="max-w-[1400px]">
      <PageHeader
        title={loader ? 'Trips to load' : 'Loading'}
        subtitle={loader ? `${user.depotId ? getDepot(user.depotId)?.name : ''} depot · count every order before release` : 'Depot loading progress and exceptions. Loaders record counts on their devices.'}
        meta={attention > 0 ? <span className="rounded-full bg-amber px-3 py-1 text-sm font-semibold text-ink">{attention} need acknowledgement</span> : undefined} />
      
      {!loader && <WorkflowBar active={['loading']} className="mt-4" />}

      {loading.length === 0 ?
      <Card className="mt-6 p-10 text-center">
          <p className="font-semibold text-ink">No trips are waiting to be loaded.</p>
          <p className="mt-1 text-sm text-subtle">Confirmed trips appear here automatically.</p>
          {!loader &&
        <Link to="/planning" className={`${buttonStyles('primary', 'md')} mt-5`}>
              Plan a Trip
            </Link>
        }
        </Card> :

      dates.map((d) => {
        const group = loading.filter((t) => t.date === d);
        return (
          <section key={d} aria-labelledby={`grp-${d}`} className="mt-8">
              <h2 id={`grp-${d}`} className="text-lg font-semibold text-ink">
                {formatDate(d, 'long')} <span className="text-sm font-medium text-subtle">· {group.length}</span>
              </h2>
              <ul className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {group.map((t) =>
              <li key={t.id}>
                    <LoadingTripCard trip={t} />
                  </li>
              )}
              </ul>
            </section>);

      })
      }
    </PageContainer>);

}