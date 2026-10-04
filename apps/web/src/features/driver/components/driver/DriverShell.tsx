import { useCallback, useState } from 'react';
import { BellIcon, MenuIcon, TruckIcon } from 'lucide-react';
import { Outlet, useLocation } from 'react-router-dom';
import { useDriver } from '../../contexts/DriverContext';
import { ConnectionPill } from './ConnectionPill';
import { DriverLogo } from './DriverLogo';
import { DriverMobileDrawer } from './DriverMobileDrawer';
import { DriverNav } from './DriverNav';
import { DriverProfileSummary } from './DriverProfileSummary';
import { LanguageToggle } from './LanguageToggle';
import { SidebarStatusCard } from './SidebarStatusCard';

const NOTIFICATION_COUNT = 1;

export function DriverShell() {
  const { identity: DRIVER, connection, demoMode, actions, error, refreshError, sync, retryAction, acknowledgeConflict } = useDriver();
  const location = useLocation();
  const [language, setLanguage] = useState('EN');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  return (
    <div className="min-h-screen w-full bg-surface md:flex md:gap-4 md:px-4 md:pb-4">
      {/* Tablet rail */}
      <aside className="sticky top-4 mt-4 hidden h-[calc(100vh-2rem)] w-[88px] shrink-0 flex-col rounded-panel bg-canvas px-2 py-6 md:flex lg:hidden">
        <DriverLogo compact />
        <div className="mt-8"><DriverNav variant="rail" /></div>
        <div className="mt-auto"><DriverProfileSummary compact /></div>
      </aside>

      {/* Desktop sidebar */}
      <aside className="sticky top-4 mt-4 hidden h-[calc(100vh-2rem)] w-64 shrink-0 flex-col overflow-y-auto rounded-panel bg-canvas py-6 lg:flex">
        <div className="px-6"><DriverLogo /></div>
        <div className="mt-8"><DriverNav variant="sidebar" /></div>
        <div className="mt-auto px-4 pt-8"><SidebarStatusCard /></div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="sticky top-0 z-30 bg-surface md:pt-4">
          <header className="flex h-16 items-center gap-2 border-b border-line px-3 md:h-[72px] md:gap-3 md:rounded-panel md:border-0 md:bg-canvas md:px-6">
            <button type="button" onClick={() => setDrawerOpen(true)} aria-label="Open navigation" aria-expanded={drawerOpen} className="grid h-12 w-12 shrink-0 place-items-center rounded-full text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand md:hidden"><MenuIcon aria-hidden className="h-6 w-6" /></button>
            <div className="flex min-w-0 flex-1 items-center gap-2 md:hidden"><DriverLogo compact /><span className="text-sm font-semibold text-ink">Driver</span></div>

            <span className="hidden items-center gap-1.5 whitespace-nowrap rounded-full bg-forest px-4 py-2 text-sm text-white shadow-card md:inline-flex">
              <span className="font-semibold">Driver</span>
              <span aria-hidden>·</span>
              <span>{DRIVER.depot || "Waypoint"} fleet</span>
            </span>

            <div className="ml-auto flex shrink-0 items-center gap-1.5 md:gap-3">
              <div className="lg:hidden"><ConnectionPill connection={connection} /></div>
              <LanguageToggle variant="compact" tone="surface" value={language} onChange={setLanguage} />
              <button type="button" aria-label={`Notifications, ${NOTIFICATION_COUNT} unread`} className="relative hidden h-12 w-12 place-items-center rounded-full bg-surface text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand md:grid">
                <BellIcon aria-hidden className="h-5 w-5" />
                <span className="absolute right-1.5 top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-danger px-1 text-[10px] font-bold text-white ring-2 ring-surface">{NOTIFICATION_COUNT}</span>
              </button>
              <div className="hidden md:block lg:hidden"><DriverProfileSummary compact /></div>
              <div className="hidden lg:block"><DriverProfileSummary /></div>
            </div>
          </header>
        </div>

        <main className="mt-0 flex-1 bg-canvas px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-5 md:mt-4 md:rounded-panel md:px-5 md:pb-5 md:pt-6 xl:px-7 xl:pb-7 xl:pt-7">
          <div className="mx-auto w-full max-w-[1440px]">
            <div className="mb-6 hidden xl:block">
              <p className="flex items-center gap-2 text-sm text-subtle"><span>{DRIVER.date}</span><span aria-hidden>·</span><TruckIcon aria-hidden className="h-4 w-4 text-forest" /><span>{DRIVER.vehicle} · {DRIVER.vehicleType} · {DRIVER.depot}</span></p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink">{pageTitle(location.pathname)}</h1>
              <p className="mt-2 text-sm text-subtle">{pageSubtitle(location.pathname)}</p>
            </div>
            {demoMode && <div role="status" className="mb-4 rounded-card bg-amber-pale p-4 text-sm text-amber-ink">Demo route and vehicle — no backend or persistent queue connected. Actions stay in memory and are lost on refresh.</div>}
            {error && <p role="alert" className="mb-4 text-danger-ink">{error}</p>}
            <button className="mb-4 min-h-12 underline" onClick={() => void sync()}>Refresh route / sync</button>
            {refreshError && <p role="alert">Route refresh failed: {refreshError}. Cached data may be outdated.</p>}
            {actions.length > 0 && <section aria-label="Synchronization" className="mb-4 space-y-3">{actions.map(action => <div key={action.id} className="rounded-card border border-line p-4 text-sm break-words"><p>{action.tripId}{action.sequence !== undefined ? ` · Stop ${action.sequence}` : ''} · {action.kind} · {action.state}</p>{action.message && <p>{action.message}</p>}{['Failed', 'Pending', 'Saved on phone', 'Needs attention'].includes(action.state) && <button className="min-h-12 underline" onClick={() => retryAction(action.id)}>Retry action</button>}{action.state === 'Conflict' && <button className="ml-3 min-h-12 underline" onClick={() => acknowledgeConflict(action.id)}>Dismiss local copy — sent to dispatcher</button>}</div>)}</section>}
            <Outlet />
          </div>
        </main>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface px-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] pt-1 md:hidden"><DriverNav variant="bottom" /></div>
      <DriverMobileDrawer open={drawerOpen} onClose={closeDrawer} />
    </div>);

}

function pageTitle(pathname: string): string {
  if (pathname === '/') return "Today's trips";
  if (pathname.startsWith('/dashboard-lab')) return 'Dashboard Lab';
  if (pathname.startsWith('/current-stop')) return 'Current stop';
  if (pathname.endsWith('/check')) return 'Pre-departure check';
  if (pathname.endsWith('/complete')) return 'Trip complete';
  if (pathname.endsWith('/delivery')) return 'Record delivery';
  if (pathname.includes('/stops')) return 'Route workspace';
  if (pathname.startsWith('/report-issue')) return 'Report issue';
  if (pathname.startsWith('/profile')) return 'Profile';
  return 'Driver';
}

function pageSubtitle(pathname: string): string {
  if (pathname.startsWith('/dashboard-lab')) return 'Plan, prioritize, and complete today’s route with confidence.';
  if (pathname.includes('/stops')) return 'Follow the dispatch sequence and keep every record ready to sync.';
  if (pathname.startsWith('/report-issue')) return 'Send an issue to Dispatch with minimal typing.';
  if (pathname.startsWith('/profile')) return 'Driver, vehicle, and offline readiness details.';
  return 'Today’s assigned delivery work.';
}