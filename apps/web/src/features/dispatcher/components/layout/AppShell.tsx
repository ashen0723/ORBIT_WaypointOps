import React, { useCallback, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Loader2Icon, WifiOffIcon } from 'lucide-react';
import { TopBar } from './TopBar';
import { Sidebar } from './Sidebar';
import { MobileDrawer } from './MobileDrawer';
import { Button } from '../ui/Button';
import { useDispatch } from '../../contexts/DispatchContext';
import { useSession } from '../../contexts/SessionContext';

export function AppShell() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { pathname } = useLocation();
  const { status, error, refresh, stale } = useDispatch();
  const { logout } = useSession();

  useEffect(() => {
    window.scrollTo(0, 0);
    setDrawerOpen(false);
  }, [pathname]);

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  if (status === 'loading') {
    return (
      <div className="grid min-h-screen w-full place-items-center bg-canvas" role="status">
        <p className="flex items-center gap-2 text-subtle">
          <Loader2Icon aria-hidden="true" className="h-5 w-5 animate-spin" />
          Loading your work…
        </p>
      </div>);

  }
  if (status === 'error') {
    return (
      <div className="grid min-h-screen w-full place-items-center bg-canvas px-4">
        <div role="alert" className="max-w-md rounded-card bg-surface p-8 text-center shadow-card">
          <WifiOffIcon aria-hidden="true" className="mx-auto h-8 w-8 text-subtle" />
          <p className="mt-4 font-semibold text-ink">Couldn’t load Waypoint</p>
          <p className="mt-1 text-sm text-subtle">{error}</p>
          <div className="mt-6 flex justify-center gap-2">
            <Button onClick={() => void refresh()}>Try again</Button>
            <Button variant="secondary" onClick={() => void logout()}>
              Sign out
            </Button>
          </div>
        </div>
      </div>);

  }

  return (
    <div className="min-h-screen w-full bg-surface text-ink md:flex md:gap-4 md:px-4 md:pb-4">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-surface focus:px-4 focus:py-2 focus:shadow-pop">
        Skip to content
      </a>
      <Sidebar />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col md:min-h-0">
        <TopBar onOpenMenu={() => setDrawerOpen(true)} />
        {stale &&
        <p role="status" className="mt-2 flex items-center gap-2 rounded-2xl bg-ink px-4 py-2 text-sm text-white md:mt-4">
            <WifiOffIcon aria-hidden="true" className="h-4 w-4 shrink-0" />
            Offline — showing your saved copy. Actions you record will sync when you reconnect.
          </p>
        }
        <main id="main" className="min-w-0 flex-1 bg-canvas md:mt-4 md:rounded-panel">
          <Outlet />
        </main>
      </div>
      <MobileDrawer open={drawerOpen} onClose={closeDrawer} />
    </div>);

}