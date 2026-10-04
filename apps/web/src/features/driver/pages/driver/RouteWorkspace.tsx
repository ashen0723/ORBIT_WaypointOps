import { Navigate, Outlet, useLocation, useParams } from 'react-router-dom';
import { RouteSidePanel } from '../../components/driver/RouteSidePanel';
import { StateBanner } from '../../components/driver/StateBanner';
import { useDriver } from '../../contexts/DriverContext';
import { StopList } from './StopList';

export function RouteWorkspace() {
  const { tripId } = useParams();
  const location = useLocation();
  const { trips: TRIPS, connection } = useDriver();
  const trip = TRIPS.find((candidate) => candidate.id === tripId);
  if (!trip) return <Navigate to="/" replace />;
  const hasSelection = /\/stops\/\d+/.test(location.pathname);
  return (
    <div className="space-y-5 md:space-y-6">
      {connection === 'offline' && <StateBanner tone="warning" title="Offline" detail="Showing available route data. Check each action's save status." />}
      <div className="md:grid md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:items-start md:gap-6 xl:grid-cols-[minmax(300px,1fr)_minmax(0,1.45fr)_minmax(280px,0.9fr)]">
        <section aria-label="Stop list" className={hasSelection ? 'hidden md:block' : 'block'}>
          <StopList />
        </section>
        <section aria-label="Selected stop" className={`${hasSelection ? 'block' : 'hidden md:block'} md:rounded-panel md:bg-surface md:p-6 md:shadow-card`}>
          <Outlet />
        </section>
        <aside aria-label="Trip manifest and sync status" className="hidden xl:block">
          <RouteSidePanel trip={trip} />
        </aside>
      </div>


    </div>);

}