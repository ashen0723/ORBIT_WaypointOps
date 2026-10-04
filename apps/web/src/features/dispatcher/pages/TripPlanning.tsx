import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { PageContainer } from '../components/ui/PageContainer';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { FilterSelect } from '../components/ui/FilterSelect';
import { WorkflowBar } from '../components/workflow/WorkflowBar';
import { PlanStepper } from '../components/planning/PlanStepper';
import { OrderPicker } from '../components/planning/OrderPicker';
import { TripSummary } from '../components/planning/TripSummary';
import { VehicleChooser } from '../components/planning/VehicleChooser';
import { ReviewTrip } from '../components/planning/ReviewTrip';
import { TripConfirmed } from '../components/planning/TripConfirmed';
import { DeferOrderModal } from '../components/orders/DeferOrderModal';
import { IncompatibleOrderModal } from '../components/planning/IncompatibleOrderModal';
import { useDispatch } from '../contexts/DispatchContext';
import type { DepotId, Order } from '../types/dispatch';
import { closureNote, earliestDeliveryDate, isOperatingDay, upcomingOperatingDays } from '../utils/calendar';
import { colomboParts, formatDate } from '../utils/clock';
import { validateTrip } from '../utils/tripValidation';

type View = 'build' | 'review' | 'confirmed';

export function TripPlanning() {
  const { draft, resetDraft, getOrder, getVehicle, getDriver, getTrip, planContext, orders, calendar, serverTime, run } = useDispatch();
  const navigate = useNavigate();
  const [view, setView] = useState<View>('build');
  const [confirmedId, setConfirmedId] = useState<string | null>(null);
  const [deferId, setDeferId] = useState<string | null>(null);
  const [blockedIds, setBlockedIds] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [serverIssues, setServerIssues] = useState<string[]>([]);

  const today = colomboParts(serverTime).date;
  const pendingDates = orders.filter((o) => o.status === 'pending' && o.depotId === draft.depotId).map((o) => o.plannedDate);
  const dateOptions = Array.from(new Set([...pendingDates, ...upcomingOperatingDays(calendar, draft.depotId, today, 6)])).sort();

  const tripOrders = draft.orderIds.map(getOrder).filter((o): o is Order => Boolean(o));
  const vehicle = draft.vehicleId ? getVehicle(draft.vehicleId) : undefined;
  // One validation result drives warnings, badges and the Confirm button.
  const result = vehicle && tripOrders.length ? validateTrip(planContext, { date: draft.date, depotId: draft.depotId, orderIds: draft.orderIds, vehicleId: vehicle.id, driverId: draft.driverId, departAt: draft.departAt }) : null;
  const confirmedTrip = confirmedId ? getTrip(confirmedId) : undefined;

  const step = view === 'confirmed' ? 4 : view === 'review' ? 3 : tripOrders.length === 0 ? 1 : 2;
  const next = tripOrders.length === 0 ? 'select orders and click Add to Trip.' : !vehicle ? 'choose a vehicle below.' : result && !result.ok ? 'fix the failing checks or choose another vehicle.' : 'review the trip.';
  const closed = draft.date && !isOperatingDay(calendar, draft.date, draft.depotId);

  const goTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });
  const editTrip = () => document.getElementById('trip-summary')?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const confirm = async () => {
    if (!vehicle || !result?.ok) return;
    setBusy(true);
    setServerIssues([]);
    const res = await run<{tripId: string;}>({ op: 'confirmTrip', proposal: { date: draft.date, depotId: draft.depotId, orderIds: draft.orderIds, vehicleId: vehicle.id, driverId: draft.driverId, departAt: draft.departAt } });
    setBusy(false);
    if (!res.ok) {
      setServerIssues(res.details);
      return;
    }
    toast.success('Trip confirmed');
    resetDraft();
    setConfirmedId(res.data.tripId);
    setView('confirmed');
    goTop();
  };

  const changeDepot = (depotId: DepotId) => resetDraft({ depotId, date: earliestDeliveryDate(calendar, depotId, serverTime) });

  return (
    <PageContainer className="max-w-[1400px]">
      <PageHeader
        title="Plan Trip"
        subtitle="Group waiting orders for one date into a trip, then assign a vehicle."
        actions={
        view === 'build' ?
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <FilterSelect label="Delivery date" value={draft.date} onChange={(d) => resetDraft({ date: d })} className="sm:w-52" options={dateOptions.map((d) => ({ value: d, label: `${formatDate(d)}${isOperatingDay(calendar, d, draft.depotId) ? '' : ' · closed'}` }))} />
              <div className="sm:w-64">
                <SegmentedControl<DepotId>
              label="Depot"
              value={draft.depotId}
              onChange={changeDepot}
              options={[
              { value: 'DEP-PLG', label: 'Peliyagoda', disabled: tripOrders.length > 0 && draft.depotId !== 'DEP-PLG' },
              { value: 'DEP-KDY', label: 'Kandy', disabled: tripOrders.length > 0 && draft.depotId !== 'DEP-KDY' }]
              } />
            
              </div>
            </div> :
        undefined
        } />
      
      <WorkflowBar active={['plan', 'assign', 'confirm']} className="mt-4" />

      <Card className="mt-4 px-4 py-4 md:px-6">
        <PlanStepper current={step} done={view === 'confirmed'} />
      </Card>

      {closed && view === 'build' &&
      <p role="alert" className="mt-4 rounded-2xl bg-danger-pale px-4 py-3 text-sm font-semibold text-danger-ink">
          {formatDate(draft.date, 'long')} is not an operating day ({closureNote(calendar, draft.date, draft.depotId)}). Trips can’t be confirmed — reschedule its orders.
        </p>
      }

      <div className="mt-6">
        {view === 'confirmed' && confirmedTrip &&
        <TripConfirmed
          trip={confirmedTrip}
          driverName={getDriver(confirmedTrip.driverId)?.name ?? 'Driver'}
          onContinue={() => navigate(`/loading/${confirmedTrip.id}`)}
          onPlanAnother={() => {
            setConfirmedId(null);
            setView('build');
          }} />

        }

        {view === 'review' && vehicle && result &&
        <ReviewTrip
          vehicle={vehicle}
          result={result}
          busy={busy}
          serverIssues={serverIssues}
          onBack={() => {
            setView('build');
            setServerIssues([]);
            goTop();
          }}
          onConfirm={() => void confirm()} />

        }

        {(view === 'build' || view === 'review' && (!vehicle || !result)) &&
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-6">
            <OrderPicker emphasize={step === 1} tripOrders={tripOrders} onBlocked={setBlockedIds} />
            <div className="space-y-4 lg:space-y-6">
              <TripSummary tripOrders={tripOrders} vehicle={vehicle} result={result} next={next} onDefer={setDeferId} />
              <VehicleChooser
              tripOrders={tripOrders}
              selectedResult={result}
              onEditTrip={editTrip}
              onReview={() => {
                setView('review');
                goTop();
              }} />
            
            </div>
          </div>
        }
      </div>

      <DeferOrderModal orderId={deferId} onClose={() => setDeferId(null)} />
      <IncompatibleOrderModal orderIds={blockedIds} tripOrders={tripOrders} onClose={() => setBlockedIds(null)} />
    </PageContainer>);

}