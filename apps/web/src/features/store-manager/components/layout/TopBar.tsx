import React from 'react';
import { MenuIcon } from 'lucide-react';
import { Logo } from './Logo';
import { NotificationsMenu } from './NotificationsMenu';
import { ProfileMenu } from './ProfileMenu';
import { OUTLET_NAME } from '../../data/schedule';
import { useOrders } from '../../contexts/OrdersContext';

interface TopBarProps {
  onOpenMenu: () => void;
  onSignOut: () => void;
}

export function TopBar({ onOpenMenu, onSignOut }: TopBarProps) {
  const { live } = useOrders();
  return (
    <div className="sticky top-0 z-30 bg-surface md:pt-4">
      <header className="flex h-16 items-center gap-3 border-b border-line px-4 md:h-[72px] md:rounded-panel md:border-0 md:bg-canvas lg:px-6">
        <button
          type="button"
          onClick={onOpenMenu}
          aria-label="Open menu"
          className="-ml-2 grid h-10 w-10 place-items-center rounded-full text-ink transition-colors duration-150 hover:bg-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand md:hidden">
          
          <MenuIcon className="h-5 w-5" />
        </button>
        <div className="md:hidden">
          <Logo />
        </div>
        <span className="hidden items-center gap-1.5 whitespace-nowrap rounded-full bg-forest px-3 py-1.5 text-sm text-white shadow-card md:inline-flex">
          <span className="font-semibold">Store Manager</span>
          <span aria-hidden="true">·</span>
          <span>{live ? 'Your outlet' : OUTLET_NAME}</span>
        </span>
        <div className="ml-auto flex items-center gap-2 md:gap-3">
          <NotificationsMenu />
          <ProfileMenu onSignOut={onSignOut} />
        </div>
      </header>
    </div>);

}
