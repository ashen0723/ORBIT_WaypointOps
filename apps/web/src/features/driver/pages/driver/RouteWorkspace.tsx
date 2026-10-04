import React from 'react';
import { Navigate, Outlet, useLocation, useParams } from 'react-router-dom';
import { ConflictDialog } from '../../components/driver/ConflictDialog';
import { RouteSidePanel } from '../../components/driver/RouteSidePanel';
import { StateBanner } from '../../components/driver/StateBanner';
import { useDriver } from '../../contexts/DriverContext';
import { TRIPS } from '../../data/driver';
import { useSyncQueue } from '../../hooks/useSyncQueue';
import { StopList } from './StopList';

export function RouteWorkspace() {
  const { tripId } = useParams();
  const location = useLocation();
  const { connection, offlineSince, lastSyncedAt, conflictPending, acknowledgeConflict } = useDriver();
  const queue = useSyncQueue();
  const trip = TRIPS.find((candidate) => candidate.id === tripId);
  if (!trip) return <Navigate to="/" replace />;
  const hasSelection = /\/stops\/\d+/.test(location.pathname);
  const showConflict = connection === 'online' && conflictPending && trip.id === 'trip-1';

  return (
    <div className="space-y-5 md:space-y-6">
      {connection === 'offline' && <StateBanner tone="warning" title={`Offline since ${offlineSince ?? '06:42'}`} detail="Your work is saved on this phone and will sync automatically." />}
      {connection === 'syncing' &&
      <StateBanner tone="success" title={`Back online — syncing ${queue.total || 6} items…`} detail="Keep the app open until the queue is clear.">
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface"><div className="h-full w-2/3 rounded-full bg-brand" /></div>
        </StateBanner>
      }
      {showConflict && <StateBanner tone="success" title="All records synced ✓" detail={`Last synced ${lastSyncedAt}`} />}

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

      {showConflict && <ConflictDialog onAcknowledge={acknowledgeConflict} />}
    </div>);

}