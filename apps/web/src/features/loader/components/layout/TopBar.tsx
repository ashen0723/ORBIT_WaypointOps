import React from 'react';
import { MenuIcon } from 'lucide-react';

import { useAuth } from '../../../../app/providers/AuthProvider';
import { Logo } from './Logo';
import { LoaderNotificationsMenu } from './LoaderNotificationsMenu';
import { ProfileMenu } from './ProfileMenu';

interface TopBarProps {
  onOpenMenu: () => void;
  onSignOut: () => void;
}

export function TopBar({
  onOpenMenu,
  onSignOut,
}: TopBarProps) {
  const { user } = useAuth();

  const depotLabel = user?.depotId ?? 'Depot not assigned';

  return (
    <div className="sticky top-0 z-30 bg-surface md:pt-4">
      <header className="flex h-16 items-center gap-3 border-b border-line px-4 md:h-[72px] md:rounded-panel md:border-0 md:bg-canvas lg:px-6">
        <button
          type="button"
          onClick={onOpenMenu}
          aria-label="Open menu"
          className="-ml-2 grid h-10 w-10 place-items-center rounded-full text-ink transition-colors duration-150 hover:bg-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand md:hidden"
        >
          <MenuIcon
            aria-hidden="true"
            className="h-5 w-5"
          />
        </button>

        <div className="md:hidden">
          <Logo />
        </div>

        <span className="hidden items-center gap-1.5 whitespace-nowrap rounded-full bg-forest px-3 py-1.5 text-sm text-white shadow-card md:inline-flex">
          <span className="font-semibold">Loader</span>

          <span aria-hidden="true">·</span>

          <span>{depotLabel}</span>
        </span>

        <div className="ml-auto flex items-center gap-2 md:gap-3">
          <LoaderNotificationsMenu />

          <ProfileMenu onSignOut={onSignOut} />
        </div>
      </header>
    </div>
  );
}