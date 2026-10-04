import React from 'react';
import { CloudCheckIcon, CloudOffIcon, RefreshCwIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CurvedLines } from '../ui/CurvedLines';
import { useDriver } from '../../contexts/DriverContext';
import { useSyncQueue } from '../../hooks/useSyncQueue';

export function SidebarStatusCard() {
  const { connection, lastSyncedAt } = useDriver();
  const queue = useSyncQueue();
  const offline = connection === 'offline';
  const syncing = connection === 'syncing';
  const Icon = offline ? CloudOffIcon : syncing ? RefreshCwIcon : CloudCheckIcon;
  const title = offline ? 'Working offline' : syncing ? 'Syncing records' : 'Ready for the route';
  const detail = queue.total ? `${queue.total} items saved on this phone · last synced ${lastSyncedAt}` : `Routes saved offline · last synced ${lastSyncedAt}`;

  return (
    <section aria-label="Driver sync status" className="relative overflow-hidden rounded-card bg-forest p-4 text-white">
      <CurvedLines className="text-white/10" />
      <span className="relative grid h-9 w-9 place-items-center rounded-full bg-white/10 ring-1 ring-white/30">
        <Icon aria-hidden className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
      </span>
      <p className="relative mt-4 text-lg font-semibold leading-tight">{title}</p>
      <p className="relative mt-1 text-xs leading-5 text-white/75">{detail}</p>
      <Link
        to="/safe-use"
        className="relative mt-4 flex h-12 w-full items-center justify-center rounded-full bg-white/10 text-sm font-semibold transition-colors duration-150 hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
        
        Safe-use mode
      </Link>
    </section>);

}