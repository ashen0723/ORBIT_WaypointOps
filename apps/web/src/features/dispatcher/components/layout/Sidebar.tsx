import React from 'react';
import { NavLink } from 'react-router-dom';
import { Logo } from './Logo';
import { NextUpCard } from './NextUpCard';
import { HOME_BY_ROLE, navByRole } from '../../data/navigation';
import { ROLE_LABEL } from '../../data/users';
import { useNavCounts } from '../../hooks/useNavCounts';
import { useDispatch } from '../../contexts/DispatchContext';

const itemBase =
'relative flex h-11 items-center gap-3 rounded-full px-3 text-[15px] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand md:justify-center lg:justify-start';

export function Sidebar() {
  const counts = useNavCounts();
  const { user } = useDispatch();

  return (
    <aside className="sticky top-4 mt-4 hidden h-[calc(100vh-2rem)] shrink-0 flex-col overflow-y-auto rounded-panel bg-canvas py-6 md:flex md:w-[88px] lg:w-64">
      <div className="flex px-6 md:justify-center md:px-0 lg:justify-start lg:px-6">
        <Logo collapsible subtitle={ROLE_LABEL[user.role]} to={HOME_BY_ROLE[user.role]} />
      </div>
      <nav aria-label="Main" className="mt-8">
        <ul className="space-y-1 px-3">
          {navByRole[user.role].map(({ to, label, icon: Icon, end }) => {
            const count = counts[to];
            return (
              <li key={to}>
                <NavLink to={to} end={end} title={label} className={({ isActive }) => `${itemBase} ${isActive ? 'font-semibold text-ink' : 'font-medium text-subtle hover:text-ink'}`}>
                  {({ isActive }) =>
                  <>
                      {isActive && <span aria-hidden="true" className="absolute -left-3 top-1/2 h-8 w-1.5 -translate-y-1/2 rounded-r-full bg-forest" />}
                      <span className="relative">
                        <Icon aria-hidden="true" className={`h-5 w-5 shrink-0 ${isActive ? 'text-forest' : ''}`} />
                        {count ? <span aria-hidden="true" className={`absolute -right-1 -top-1 h-2 w-2 rounded-full lg:hidden ${count.tone === 'danger' ? 'bg-danger' : 'bg-amber'}`} /> : null}
                      </span>
                      <span className="whitespace-nowrap md:sr-only lg:not-sr-only">{label}</span>
                      {count ?
                    <span className={`ml-auto hidden min-w-6 rounded-full px-1.5 py-0.5 text-center text-[11px] font-bold tabular-nums lg:inline ${count.tone === 'danger' ? 'bg-danger-pale text-danger-ink' : 'bg-surface text-ink'}`}>
                          {count.value}
                          <span className="sr-only"> {count.srLabel}</span>
                        </span> :
                    null}
                    </>
                  }
                </NavLink>
              </li>);

          })}
        </ul>
      </nav>
      {user.role === 'dispatcher' &&
      <div className="mt-auto hidden px-4 pt-8 lg:block">
          <NextUpCard />
        </div>
      }
    </aside>);

}