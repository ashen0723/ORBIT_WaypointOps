import React, { useState } from 'react';
import { PageContainer } from '../components/ui/PageContainer';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { FilterSelect } from '../components/ui/FilterSelect';
import { useDispatch } from '../contexts/DispatchContext';
import { formatDateTime } from '../utils/clock';

export function History() {
  const { events } = useDispatch();
  const [type, setType] = useState<string>('all');
  const types = Array.from(new Set(events.map((e) => e.type))).sort();
  const list = events.filter((e) => type === 'all' || e.type === type);

  return (
    <PageContainer className="max-w-[1100px]">
      <PageHeader title="History" subtitle="Every recorded operational event, newest first." />
      <div className="mt-6 max-w-xs">
        <FilterSelect label="Event type" value={type} onChange={setType} options={[{ value: 'all', label: 'All events' }, ...types.map((t) => ({ value: t, label: t.replace(/_/g, ' ') }))]} />
      </div>
      {list.length === 0 ?
      <Card className="mt-4 p-10 text-center text-subtle">No events recorded yet.</Card> :

      <Card className="mt-4">
          <ol className="divide-y divide-line">
            {list.map((e) =>
          <li key={e.id} className="px-5 py-3">
                <p className="text-sm text-ink">{e.message}</p>
                <p className="text-xs text-subtle">
                  {e.type.replace(/_/g, ' ')} · {e.actorName} · {formatDateTime(e.at)}
                </p>
              </li>
          )}
          </ol>
        </Card>
      }
    </PageContainer>);

}