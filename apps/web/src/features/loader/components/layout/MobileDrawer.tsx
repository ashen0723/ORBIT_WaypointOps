import React, { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  AnimatePresence,
  motion,
} from 'framer-motion';
import {
  LogOutIcon,
  XIcon,
} from 'lucide-react';

import { useAuth } from '../../../../app/providers/AuthProvider';
import { Logo } from './Logo';
import { AppPromoCard } from './AppPromoCard';
import { Avatar } from '../ui/Avatar';
import {
  generalNav,
  menuNav,
} from '../../data/navigation';

interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
  onSignOut: () => void;
}

const EASE = [
  0.23,
  1,
  0.32,
  1,
] as const;

function formatRole(role?: string) {
  if (!role) {
    return 'Loader';
  }

  return role
    .split('_')
    .map(
      (part) =>
        part.charAt(0).toUpperCase() +
        part.slice(1),
    )
    .join(' ');
}

export function MobileDrawer({
  open,
  onClose,
  onSignOut,
}: MobileDrawerProps) {
  const { user } = useAuth();

  const displayName = user?.name ?? 'Loader';
  const roleLabel = formatRole(user?.role);
  const depotLabel =
    user?.depotId ?? 'Depot not assigned';

  useEffect(() => {
    if (!open) {
      return;
    }

    const onKey = (
      event: KeyboardEvent,
    ) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener(
      'keydown',
      onKey,
    );

    return () =>
      window.removeEventListener(
        'keydown',
        onKey,
      );
  }, [open, onClose]);

  const linkClass = ({
    isActive,
  }: {
    isActive: boolean;
  }) =>
    `relative flex h-12 items-center gap-3 rounded-full px-4 text-base transition-colors duration-150 ${isActive
      ? 'bg-surface font-semibold text-ink'
      : 'font-medium text-subtle hover:text-ink'
    }`;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <motion.div
            aria-hidden="true"
            className="absolute inset-0 bg-black/40"
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: 1,
            }}
            exit={{
              opacity: 0,
            }}
            transition={{
              duration: 0.2,
              ease: EASE,
            }}
            onClick={onClose}
          />

          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="absolute inset-y-0 left-0 flex w-[300px] max-w-[85vw] flex-col overflow-y-auto rounded-r-panel bg-canvas shadow-pop"
            initial={{
              x: '-100%',
            }}
            animate={{
              x: 0,
            }}
            exit={{
              x: '-100%',
            }}
            transition={{
              duration: 0.25,
              ease: EASE,
            }}
          >
            <div className="flex h-16 shrink-0 items-center justify-between px-4">
              <Logo />

              <button
                type="button"
                onClick={onClose}
                aria-label="Close menu"
                className="grid h-10 w-10 place-items-center rounded-full text-subtle hover:bg-surface hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                <XIcon
                  aria-hidden="true"
                  className="h-5 w-5"
                />
              </button>
            </div>

            <div className="px-4">
              <div className="flex items-center gap-3 rounded-card bg-surface p-3">
                <Avatar name={displayName} />

                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink">
                    {displayName}
                  </p>

                  <p className="truncate text-xs text-subtle">
                    {roleLabel} · {depotLabel}
                  </p>

                  {user?.email && (
                    <p className="mt-0.5 truncate text-xs text-muted">
                      {user.email}
                    </p>
                  )}
                </div>
              </div>

              <p className="mt-2 inline-flex rounded-full bg-brand-pale px-3 py-1 text-xs text-forest">
                <span className="font-semibold">
                  Loader
                </span>

                <span className="mx-1">
                  ·
                </span>

                <span>{depotLabel}</span>
              </p>
            </div>

            <nav
              aria-label="Main"
              className="mt-6 px-3"
            >
              <p className="px-4 text-xs font-medium uppercase tracking-wide text-subtle">
                Menu
              </p>

              <div className="mt-2 flex flex-col gap-1">
                {menuNav.map(
                  ({
                    to,
                    label,
                    icon: Icon,
                    end,
                  }) => (
                    <NavLink
                      key={to}
                      to={to}
                      end={end}
                      onClick={onClose}
                      className={linkClass}
                    >
                      <Icon
                        aria-hidden="true"
                        className="h-5 w-5"
                      />

                      {label}
                    </NavLink>
                  ),
                )}
              </div>

              <p className="mt-6 px-4 text-xs font-medium uppercase tracking-wide text-subtle">
                General
              </p>

              <div className="mt-2 flex flex-col gap-1">
                {generalNav.map(
                  ({
                    to,
                    label,
                    icon: Icon,
                    end,
                  }) => (
                    <NavLink
                      key={to}
                      to={to}
                      end={end}
                      onClick={onClose}
                      className={linkClass}
                    >
                      <Icon
                        aria-hidden="true"
                        className="h-5 w-5"
                      />

                      {label}
                    </NavLink>
                  ),
                )}

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onSignOut();
                  }}
                  className="flex h-12 items-center gap-3 rounded-full px-4 text-base font-medium text-danger-ink hover:bg-danger-pale"
                >
                  <LogOutIcon
                    aria-hidden="true"
                    className="h-5 w-5"
                  />

                  Log out
                </button>
              </div>
            </nav>

            <div className="mt-auto p-4 pt-8">
              <AppPromoCard />
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}