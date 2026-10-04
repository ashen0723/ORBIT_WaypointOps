import type { LucideIcon } from 'lucide-react';
import { CircleUserRoundIcon, FlaskConicalIcon, LogOutIcon, MapPinnedIcon, RouteIcon, TriangleAlertIcon } from 'lucide-react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../../../../app/providers/AuthProvider';

type NavItem = {
  to: string;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  end: boolean;
  mobile: boolean;
};

const MENU_ITEMS: NavItem[] = [
{ to: '/', label: 'Today', shortLabel: 'Today', icon: RouteIcon, end: true, mobile: true },
{ to: '/current-stop', label: 'Current stop', shortLabel: 'Stop', icon: MapPinnedIcon, end: false, mobile: true },
{ to: '/report-issue', label: 'Report issue', shortLabel: 'Report', icon: TriangleAlertIcon, end: false, mobile: true },
{ to: '/dashboard-lab', label: 'Dashboard Lab', shortLabel: 'Lab', icon: FlaskConicalIcon, end: false, mobile: false }];


const GENERAL_ITEMS: NavItem[] = [
{ to: '/profile', label: 'Profile', shortLabel: 'Profile', icon: CircleUserRoundIcon, end: false, mobile: true }];


const MOBILE_ITEMS = [...MENU_ITEMS, ...GENERAL_ITEMS].filter((item) => item.mobile);
type Variant = 'bottom' | 'rail' | 'sidebar';

const SIDEBAR_ITEM = 'relative flex h-12 w-full items-center gap-3 rounded-full px-3 text-[15px] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand';

export function DriverNav({ variant }: {variant: Variant;}) {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  if (variant === 'bottom') return <nav aria-label="Driver navigation"><ul className="grid grid-cols-4">{MOBILE_ITEMS.map((item) => <CompactLink key={item.to} item={item} variant={variant} pathname={location.pathname} />)}</ul></nav>;
  if (variant === 'rail') return <nav aria-label="Driver navigation"><ul className="flex flex-col gap-2">{[...MENU_ITEMS, ...GENERAL_ITEMS].map((item) => <CompactLink key={item.to} item={item} variant={variant} pathname={location.pathname} />)}</ul></nav>;

  const signOut = () => {
    toast('Signed out of Waypoint Driver', { description: 'Check pending actions before leaving.' });
    navigate('/');
    void logout(); // merge: shared session logout; root returns to /login
  };

  return (
    <nav aria-label="Driver navigation">
      <SectionLabel>Menu</SectionLabel>
      <ul className="mt-2 space-y-1 px-3">{MENU_ITEMS.map((item) => <SidebarLink key={item.to} item={item} pathname={location.pathname} />)}</ul>
      <SectionLabel className="mt-8">General</SectionLabel>
      <ul className="mt-2 space-y-1 px-3">
        {GENERAL_ITEMS.map((item) => <SidebarLink key={item.to} item={item} pathname={location.pathname} />)}
        <li>
          <button type="button" onClick={signOut} className={`${SIDEBAR_ITEM} font-medium text-subtle hover:text-ink`}>
            <LogOutIcon aria-hidden className="h-5 w-5 shrink-0" />
            <span className="whitespace-nowrap">Log out</span>
          </button>
        </li>
      </ul>
    </nav>);

}

function SectionLabel({ children, className = '' }: {children: string;className?: string;}) {
  return <p className={`px-8 text-xs font-medium uppercase tracking-wide text-subtle ${className}`}>{children}</p>;
}

function isItemActive(item: NavItem, pathname: string, isActive: boolean) {
  return isActive || item.to === '/current-stop' && pathname.includes('/stops/');
}

function SidebarLink({ item, pathname }: {item: NavItem;pathname: string;}) {
  const Icon = item.icon;
  return (
    <li>
      <NavLink to={item.to} end={item.end} className={({ isActive }) => `${SIDEBAR_ITEM} ${isItemActive(item, pathname, isActive) ? 'font-semibold text-ink' : 'font-medium text-subtle hover:text-ink'}`}>
        {({ isActive }) => {
          const active = isItemActive(item, pathname, isActive);
          return (
            <>
              {active && <span aria-hidden className="absolute -left-3 top-1/2 h-8 w-1.5 -translate-y-1/2 rounded-r-full bg-forest" />}
              <Icon aria-hidden className={`h-5 w-5 shrink-0 ${active ? 'text-forest' : ''}`} />
              <span className="whitespace-nowrap">{item.label}</span>
            </>);

        }}
      </NavLink>
    </li>);

}

function CompactLink({ item, variant, pathname }: {item: NavItem;variant: 'bottom' | 'rail';pathname: string;}) {
  const Icon = item.icon;
  const marker = variant === 'bottom' ?
  'absolute left-1/2 top-0 h-1.5 w-8 -translate-x-1/2 rounded-b-full bg-forest' :
  'absolute -left-2 top-1/2 h-8 w-1.5 -translate-y-1/2 rounded-r-full bg-forest';
  return (
    <li>
      <NavLink to={item.to} end={item.end} className={({ isActive }) => `relative flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${isItemActive(item, pathname, isActive) ? 'font-semibold text-ink' : 'font-medium text-subtle hover:text-ink'}`}>
        {({ isActive }) => {
          const active = isItemActive(item, pathname, isActive);
          return (
            <>
              {active && <span aria-hidden className={marker} />}
              <Icon aria-hidden className={`h-5 w-5 shrink-0 ${active ? 'text-forest' : ''}`} />
              <span className="whitespace-nowrap">{item.shortLabel}</span>
            </>);

        }}
      </NavLink>
    </li>);

}