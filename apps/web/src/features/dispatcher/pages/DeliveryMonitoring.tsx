import React from 'react';
import { PageContainer } from '../components/ui/PageContainer';
import { PageHeader } from '../components/ui/PageHeader';
import { WorkflowBar } from '../components/workflow/WorkflowBar';
import { TripStatusCard } from '../components/monitoring/TripStatusCard';
import { useDispatch } from '../contexts/DispatchContext';
import { addDays, colomboParts } from '../utils/clock';
import { MonitorState, tripMonitorState } from '../utils/status';

const COLUMNS: {state: MonitorState;title: string;dot: string;empty: string;}[] = [
{ state: 'delayed', title: 'Attention Required', dot: 'bg-danger', empty: 'No delays right now.' },
{ state: 'on_schedule', title: 'In Progress', dot: 'bg-brand', empty: 'No trips on the road.' },
{ state: 'completed', title: 'Completed', dot: 'bg-muted', empty: 'No finished trips in the last two days.' }];


export function DeliveryMonitoring() {
  const { trips, serverTime } = useDispatch();
  const from = addDays(colomboParts(serverTime).date, -1);
  const active = trips.filter((t) => t.status !== 'loading' && (t.status !== 'completed' || t.date >= from));

  return (
    <PageContainer className="max-w-[1400px]">
      <PageHeader title="Delivery Monitoring" subtitle="Live progress reported by drivers." />
      <WorkflowBar active={['monitor', 'problems']} className="mt-4" />
      <div className="mt-6 grid items-start gap-6 lg:grid-cols-3">
        {COLUMNS.map((c) => {
          const list = active.filter((t) => tripMonitorState(t) === c.state);
          return (
            <section key={c.state} aria-labelledby={`col-${c.state}`}>
              <h2 id={`col-${c.state}`} className="flex items-center gap-2 text-lg font-semibold text-ink">
                <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${c.dot}`} />
                {c.title}
                <span className="text-sm font-medium text-subtle">{list.length}</span>
              </h2>
              {list.length === 0 ?
              <p className="mt-3 rounded-card border-2 border-dashed border-line px-4 py-8 text-center text-sm text-subtle">{c.empty}</p> :

              <ul className="mt-3 space-y-4">
                  {list.map((t) =>
                <li key={t.id}>
                      <TripStatusCard trip={t} />
                    </li>
                )}
                </ul>
              }
            </section>);

        })}
      </div>
    </PageContainer>);

}