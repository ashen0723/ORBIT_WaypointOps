import React from 'react';
import { NavLink } from 'react-router-dom';
import { mobileTabs } from '../../data/navigation';

export function BottomTabs() {
  return (
    <nav aria-label="Tabs" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface md:hidden">
      <ul className="grid h-16 grid-cols-4">
        {mobileTabs.map(({ to, label, icon: Icon, end }) =>
        <li key={to}>
            <NavLink
            to={to}
            end={end}
            className={({ isActive }) =>
            `flex h-full flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand ${
            isActive ? 'text-brand' : 'text-subtle'}`

            }>
            
              <Icon aria-hidden="true" className="h-5 w-5" />
              <span className="whitespace-nowrap">{label}</span>
            </NavLink>
          </li>
        )}
      </ul>
    </nav>);

}