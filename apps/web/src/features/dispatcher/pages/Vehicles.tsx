import React, { useState } from 'react';
import { PageContainer } from '../components/ui/PageContainer';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { FilterSelect } from '../components/ui/FilterSelect';
import { VehicleCard } from '../components/vehicles/VehicleCard';
import { VehicleDrawer } from '../components/vehicles/VehicleDrawer';
import { useDispatch } from '../contexts/DispatchContext';
import type { DepotId } from '../types/dispatch';
import { colomboParts, formatDate } from '../utils/clock';
import { VehicleState, vehicleState } from '../utils/status';
import { vehicleDayTrips } from '../utils/tripValidation';

export function Vehicles() {
  const { vehicles, trips, serverTime } = useDispatch();
  const today = colomboParts(serverTime).date;
  const [date, setDate] = useState(today);
  const [depot, setDepot] = useState<'all' | DepotId>('all');
  const [status, setStatus] = useState<'all' | VehicleState>('all');
  const [viewId, setViewId] = useState<string | null>(null);

  const dates = Array.from(new Set([today, ...trips.map((t) => t.date)])).sort();
  const withState = vehicles.map((v) => ({ v, state: vehicleState(v, trips, date) }));
  const available = withState.filter((x) => x.state === 'available').length;
  const list = withState.filter((x) => (depot === 'all' || x.v.depotId === depot) && (status === 'all' || x.state === status));

  return (
    <PageContainer className="max-w-[1400px]">
      <PageHeader title="Vehicles" subtitle={`${vehicles.length} vehicles · ${available} available on ${formatDate(date)}`} />

      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center">
        <FilterSelect label="Date" value={date} onChange={setDate} className="sm:w-48" options={dates.map((d) => ({ value: d, label: formatDate(d) }))} />
        <div className="sm:w-[340px]">
          <SegmentedControl<'all' | DepotId>
            label="Depot"
            value={depot}
            onChange={setDepot}
            options={[
            { value: 'all', label: 'All depots' },
            { value: 'DEP-PLG', label: 'Peliyagoda' },
            { value: 'DEP-KDY', label: 'Kandy' }]
            } />
          
        </div>
        <FilterSelect<'all' | VehicleState>
          label="Status"
          value={status}
          onChange={setStatus}
          className="sm:w-48"
          options={[
          { value: 'all', label: 'Any status' },
          { value: 'available', label: 'Available' },
          { value: 'on_trip', label: 'On Trip' },
          { value: 'loading', label: 'Loading' },
          { value: 'unavailable', label: 'Unavailable' }]
          } />
        
      </div>

      {list.length === 0 ?
      <Card className="mt-6 p-10 text-center text-subtle">No vehicles match these filters.</Card> :

      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {list.map(({ v, state }) =>
        <li key={v.id}>
              <VehicleCard vehicle={v} state={state} tripsUsed={vehicleDayTrips(trips, v.id, date).length} onView={() => setViewId(v.id)} />
            </li>
        )}
        </ul>
      }

      <VehicleDrawer vehicleId={viewId} date={date} onClose={() => setViewId(null)} />
    </PageContainer>);

}