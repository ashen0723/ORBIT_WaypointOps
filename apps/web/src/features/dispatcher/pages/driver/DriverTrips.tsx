import React from 'react';
import { Link } from 'react-router-dom';
import { PageContainer } from '../../components/ui/PageContainer';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { StatusBadge } from '../../components/dispatch/StatusBadge';
import { StopProgress } from '../../components/monitoring/StopProgress';
import { useDispatch } from '../../contexts/DispatchContext';
import { formatDate } from '../../utils/clock';
import { tripLabel } from '../../utils/format';
import { LOADING_BADGE, MONITOR_BADGE, tripLoadingState, tripMonitorState } from '../../utils/status';
import { to12h } from '../../utils/time';

export function DriverTrips() {
  const { trips } = useDispatch();
  const list = [...trips].sort((a, b) => a.date.localeCompare(b.date) || a.departAt.localeCompare(b.departAt));

  return (
    <PageContainer className="max-w-[720px]">
      <PageHeader title="My Trips" subtitle="Trips assigned to you." />
      {list.length === 0 ?
      <Card className="mt-6 p-10 text-center text-subtle">No trips assigned.</Card> :

      <ul className="mt-6 space-y-3">
          {list.map((t) =>
        <li key={t.id}>
              <Link to={`/driver/${t.id}`} className="block rounded-card bg-surface p-5 shadow-card hover:shadow-pop focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-ink">{tripLabel(t.number)}</p>
                    <p className="text-sm text-subtle">
                      {formatDate(t.date)} · departs {to12h(t.departAt)} · {t.vehicleId}
                    </p>
                  </div>
                  <StatusBadge badge={t.status === 'loading' ? LOADING_BADGE[tripLoadingState(t)] : MONITOR_BADGE[tripMonitorState(t)]} size="sm" />
                </div>
                <div className="mt-3">
                  <StopProgress stops={t.stops} />
                </div>
              </Link>
            </li>
        )}
        </ul>
      }
    </PageContainer>);

}