import React from 'react';
import { NavLink } from 'react-router-dom';
import { LogOutIcon } from 'lucide-react';
import { Logo } from './Logo';
import { AppPromoCard } from './AppPromoCard';
import { generalNav, menuNav } from '../../data/navigation';
const itemBase = 'relative flex h-11 items-center gap-3 rounded-full px-3 text-[15px] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand md:justify-center lg:justify-start';
function SectionLabel({
  children,
  className = ''



}: {children: string;className?: string;}) {
  return <p className={`px-8 text-xs font-medium uppercase tracking-wide text-subtle md:sr-only lg:not-sr-only ${className}`}>{children}</p>;
}
export function Sidebar({
  onSignOut


}: {onSignOut: () => void;}) {
  const renderLink = ({
    to,
    label,
    icon: Icon,
    end
  }: (typeof menuNav)[number]) => <li key={to}>
      <NavLink to={to} end={end} title={label} className={({
      isActive
    }) => `${itemBase} ${isActive ? 'font-semibold text-ink' : 'font-medium text-subtle hover:text-ink'}`}>
        {({
        isActive
      }) => <>
            {isActive && <span aria-hidden="true" className="absolute -left-3 top-1/2 h-8 w-1.5 -translate-y-1/2 rounded-r-full bg-forest" />}
            <Icon aria-hidden="true" className={`h-5 w-5 shrink-0 ${isActive ? 'text-forest' : ''}`} />
            <span className="whitespace-nowrap md:sr-only lg:not-sr-only">{label}</span>
          </>}
      </NavLink>
    </li>;
  return <aside className="sticky top-4 mt-4 hidden h-[calc(100vh-2rem)] shrink-0 flex-col overflow-y-auto rounded-panel bg-canvas py-6 md:flex md:w-[88px] lg:w-64">
      <div className="flex px-6 md:justify-center md:px-0 lg:justify-start lg:px-6">
        <Logo collapsible />
      </div>
      <nav aria-label="Main" className="mt-8">
        <SectionLabel>Menu</SectionLabel>
        <ul className="mt-2 space-y-1 px-3">{menuNav.map(renderLink)}</ul>
        <SectionLabel className="mt-8">General</SectionLabel>
        <ul className="mt-2 space-y-1 px-3">
          {generalNav.map(renderLink)}
          <li>
            <button type="button" onClick={onSignOut} title="Log out" className={`${itemBase} w-full font-medium text-subtle hover:text-ink`}>
              <LogOutIcon aria-hidden="true" className="h-5 w-5 shrink-0" />
              <span className="whitespace-nowrap md:sr-only lg:not-sr-only">Log out</span>
            </button>
          </li>
        </ul>
      </nav>
      <div className="mt-auto hidden px-4 pt-8 lg:block"><AppPromoCard /></div>
    </aside>;
}