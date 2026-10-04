import React, { useEffect, useState } from 'react';
import { LogOutIcon, MenuIcon } from 'lucide-react';
import { Logo } from './Logo';
import { SyncStatus } from './SyncStatus';
import { Avatar } from '../ui/Avatar';
import { useDispatch } from '../../contexts/DispatchContext';
import { useSession } from '../../contexts/SessionContext';
import { HOME_BY_ROLE } from '../../data/navigation';
import { ROLE_LABEL } from '../../data/users';
import { colomboParts, formatDate } from '../../utils/clock';
import { outletLabel } from '../../utils/format';
import { to12h } from '../../utils/time';

export function TopBar({ onOpenMenu }: {onOpenMenu: () => void;}) {
  const { user, getOutlet, getDepot, getDriver } = useDispatch();
  const { logout } = useSession();
  const [now, setNow] = useState(() => colomboParts(new Date()));

  useEffect(() => {
    const t = window.setInterval(() => setNow(colomboParts(new Date())), 30000);
    return () => window.clearInterval(t);
  }, []);

  const scope =
  user.role === 'store_manager' ?
  outletLabel(user.outletId ? getOutlet(user.outletId) : undefined) :
  user.role === 'loader' ?
  `${user.depotId ? getDepot(user.depotId)?.name ?? '' : ''} depot` :
  user.role === 'driver' ?
  getDriver(user.driverId ?? '')?.name ?? 'My trips' :
  'Peliyagoda & Kandy';

  return (
    <div className="sticky top-0 z-30 bg-surface md:pt-4">
      <header className="flex h-16 items-center gap-3 border-b border-line px-4 md:h-[72px] md:rounded-panel md:border-0 md:bg-canvas lg:px-6">
        <button
          type="button"
          onClick={onOpenMenu}
          aria-label="Open menu"
          className="-ml-2 grid h-11 w-11 place-items-center rounded-full text-ink transition-colors duration-150 hover:bg-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand md:hidden">
          
          <MenuIcon className="h-5 w-5" />
        </button>
        <div className="hidden sm:block md:hidden">
          <Logo to={HOME_BY_ROLE[user.role]} />
        </div>
        <span className="hidden items-center gap-1.5 whitespace-nowrap rounded-full bg-forest px-3 py-1.5 text-sm text-white shadow-card md:inline-flex">
          <span className="font-semibold">{ROLE_LABEL[user.role]}</span>
          <span aria-hidden="true">·</span>
          <span className="max-w-[220px] truncate">{scope}</span>
        </span>
        <span className="hidden whitespace-nowrap text-sm text-subtle xl:inline">
          {formatDate(now.date, 'long')} · <span className="font-semibold tabular-nums text-ink">{to12h(now.time)}</span> Colombo
        </span>
        <div className="ml-auto flex items-center gap-2 md:gap-3">
          <SyncStatus />
          <span className="hidden text-right lg:block">
            <span className="block text-sm font-semibold text-ink">{user.name}</span>
            <span className="block text-xs text-subtle">{user.email}</span>
          </span>
          <Avatar name={user.name} size="sm" />
          <button
            type="button"
            onClick={() => void logout()}
            aria-label="Sign out"
            title="Sign out"
            className="grid h-10 w-10 place-items-center rounded-full text-subtle transition-colors duration-150 hover:bg-surface hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
            
            <LogOutIcon aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>
      </header>
    </div>);

}