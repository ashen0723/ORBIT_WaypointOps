import { createContext, useContext, type ReactNode } from 'react';
import type { DispatcherOrderView, TripView, VehicleView, LoadingView } from '@waypoint/contracts';
import { useQuery } from '../../../api/useQuery';
import { useDispatcher } from './context';
import { overviewModel } from './overview-model';
function useOverviewData() {
  const { api, date, depotId, depots, depotError } = useDispatcher();
  const orders = useQuery(`overview-orders:${depotId}`, s => api.all<DispatcherOrderView>('/dispatcher/orders', { depotId }, s), 15000);
  const trips = useQuery(`overview-trips:${date}:${depotId}`, s => api.all<TripView>('/trips', {date,depotId}, s), 15000);
  const fleet = useQuery(`overview-fleet:${date}:${depotId}:${depots.map(d=>d.id).join(',')}`, async s => (await Promise.all((depotId ? [depotId] : depots.map(d=>d.id)).map(id=>api.all<VehicleView>('/vehicles',{date,depotId:id},s)))).flat(),15000);
  const loadingTrips = (trips.data ?? []).filter(t=>t.publishedAt && ['CONFIRMED','LOADING','READY'].includes(t.status));
  const issues = useQuery(`overview-loading:${date}:${depotId}:${loadingTrips.map(t=>`${t.id}:${t.version}`).join(',')}`, async s => {
    const result = [];
    for (const trip of loadingTrips) { const loading = await api.get<LoadingView>(`/trips/${trip.id}/loading`,s); result.push(...loading.issues); }
    return result;
  },15000);
  const model = overviewModel(orders.data ?? [],trips.data ?? [],fleet.data ?? [],issues.data ?? [], Date.now(), date);
  return { ...model, orders:orders.data ?? [], trips:trips.data ?? [], fleet:fleet.data ?? [],
    ordersReady: !!orders.data, tripsReady: !!trips.data, fleetReady: !!fleet.data && depots.length > 0 && !depotError,
    issuesReady: !!issues.data && !issues.error, error:orders.error || trips.error || fleet.error || issues.error || depotError,
    busy: orders.loading || trips.loading || fleet.loading || issues.loading,
    refresh:()=>{orders.refresh();trips.refresh();fleet.refresh();issues.refresh();} };
}
const Context = createContext<ReturnType<typeof useOverviewData>|null>(null);
export function OverviewProvider({children}:{children:ReactNode}) { const value=useOverviewData(); return <Context.Provider value={value}>{children}</Context.Provider>; }
export function useOverview(){const value=useContext(Context);if(!value)throw new Error('OverviewProvider is required');return value;}
