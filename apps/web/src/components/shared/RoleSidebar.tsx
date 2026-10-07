import { SidebarFrame } from './SidebarFrame';
import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { NavigationSectionLabel } from './NavigationSectionLabel';
import { NavLink } from 'react-router-dom';
import { LogOutIcon } from 'lucide-react';
import { WaypointLogo } from './WaypointLogo';
interface SidebarItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

interface RoleSidebarProps {
  menuNav: readonly SidebarItem[];
  generalNav: readonly SidebarItem[];
  onSignOut: () => void;
  footer?: ReactNode;
  logo?: ReactNode;
}

const itemBase =
'relative flex h-11 items-center gap-3 rounded-full px-3 text-[15px] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand md:justify-center lg:justify-start';



export function RoleSidebar({ menuNav, generalNav, onSignOut, footer, logo = <WaypointLogo collapsible /> }: RoleSidebarProps) {
  const renderLink = ({ to, label, icon: Icon, end }: (typeof menuNav)[number]) =>
  <li key={to}>
      <NavLink
      to={to}
      end={end}
      title={label}
      className={({ isActive }) => `${itemBase} ${isActive ? 'font-semibold text-ink' : 'font-medium text-subtle hover:text-ink'}`}>
      
        {({ isActive }) =>
      <>
            {isActive && <span aria-hidden="true" className="absolute -left-3 top-1/2 h-8 w-1.5 -translate-y-1/2 rounded-r-full bg-forest" />}
            <Icon aria-hidden="true" className={`h-5 w-5 shrink-0 ${isActive ? 'text-forest' : ''}`} />
            <span className="whitespace-nowrap md:sr-only lg:not-sr-only">{label}</span>
          </>
      }
      </NavLink>
    </li>;


  return (
    <SidebarFrame logo={logo} footer={footer}>
        <NavigationSectionLabel variant="collapsible">Menu</NavigationSectionLabel>
        <ul className="mt-2 space-y-1 px-3">{menuNav.map(renderLink)}</ul>
        <NavigationSectionLabel variant="collapsible" className="mt-8">General</NavigationSectionLabel>
        <ul className="mt-2 space-y-1 px-3">
          {generalNav.map(renderLink)}
          <li>
            <button type="button" onClick={onSignOut} title="Log out" className={`${itemBase} w-full font-medium text-subtle hover:text-ink`}>
              <LogOutIcon aria-hidden="true" className="h-5 w-5 shrink-0" />
              <span className="whitespace-nowrap md:sr-only lg:not-sr-only">Log out</span>
            </button>
          </li>
        </ul>
    </SidebarFrame>);

}
