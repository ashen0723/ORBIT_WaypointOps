import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { CircleCheckIcon } from 'lucide-react';
import { PageContainer } from '../components/ui/PageContainer';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { WorkflowBar } from '../components/workflow/WorkflowBar';
import { DeferralCard } from '../components/deferrals/DeferralCard';
import { RescheduleModal } from '../components/deferrals/RescheduleModal';
import { DeferralHistory } from '../components/deferrals/DeferralHistory';
import { useDispatch } from '../contexts/DispatchContext';
import { plural } from '../utils/format';

export function Deferrals() {
  const { deferrals, getOrder, returnToPlanning, startTripWith } = useDispatch();
  const navigate = useNavigate();
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);

  const returnOrder = (orderId: string) => {
    returnToPlanning(orderId);
    toast.success('Back in Orders', {
      description: `${orderId} is waiting for a trip.`,
      action: {
        label: 'Plan Trip',
        onClick: () => {
          startTripWith(orderId);
          navigate('/planning');
        }
      }
    });
  };

  return (
    <PageContainer className="max-w-[1400px]">
      <PageHeader title="Deferred Orders" subtitle="Orders that couldn’t be delivered. Each has a reason and a new date." meta={<span className="rounded-full bg-surface px-3 py-1 text-sm font-semibold text-ink shadow-card">{plural(deferrals.length, 'order')} deferred</span>} />
      <WorkflowBar variant="defer" className="mt-4" />

      {deferrals.length === 0 ?
      <Card className="mt-6 flex items-center gap-3 p-6 text-forest">
          <CircleCheckIcon aria-hidden="true" className="h-6 w-6" />
          <p className="font-semibold">No deferred orders.</p>
        </Card> :

      <ul className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {deferrals.map((d) => {
          const order = getOrder(d.orderId);
          if (!order) return null;
          return (
            <li key={d.orderId}>
                <DeferralCard deferral={d} order={order} onReschedule={() => setRescheduleId(d.orderId)} onReturn={() => returnOrder(d.orderId)} />
              </li>);

        })}
        </ul>
      }

      <DeferralHistory />

      <RescheduleModal orderId={rescheduleId} onClose={() => setRescheduleId(null)} />
    </PageContainer>);

}