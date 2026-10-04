import { useOrders } from '../../contexts/OrdersContext';
import { useCallback, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../../../../app/providers/AuthProvider';
import { TopBar } from './TopBar';
import { Sidebar } from './Sidebar';
import { BottomTabs } from './BottomTabs';
import { MobileDrawer } from './MobileDrawer';

export function AppShell() {
  const { error, refresh } = useOrders();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
    setDrawerOpen(false);
  }, [pathname]);

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  // Merge: sign-out now uses the shared session; the root returns to /login.
  const { logout } = useAuth();
  const signOut = useCallback(() => {
    toast('Signed out');
    void logout();
  }, [logout]);

  return (
    <div className="store-manager-shell min-h-screen w-full bg-surface text-ink md:flex md:gap-4 md:px-4 md:pb-4">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-surface focus:px-4 focus:py-2 focus:shadow-pop">
        
        Skip to content
      </a>
      <Sidebar onSignOut={signOut} />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col md:min-h-0">
        <TopBar onOpenMenu={() => setDrawerOpen(true)} onSignOut={signOut} />
        <main id="main" className="min-w-0 flex-1 bg-canvas pb-16 md:mt-4 md:rounded-panel md:pb-0">
          {error && <div role="alert" className="m-6 rounded-card bg-danger-pale p-4 text-danger-ink">{error} <button className="ml-3 underline" onClick={() => void refresh()}>Retry</button></div>}
          <Outlet />
        </main>
      </div>
      <BottomTabs />
      <MobileDrawer open={drawerOpen} onClose={closeDrawer} onSignOut={signOut} />
    </div>);

}