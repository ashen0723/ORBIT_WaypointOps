import React, { useEffect, useReducer, useRef } from 'react';
import { ROLE_BASE_PATH, type Role } from '@waypoint/contracts';
import { resolveRoute } from './routes';

export type RoleModules = Record<Role, React.ComponentType<{ basename?: string }>>;

interface RoleRouterProps {
  /** Signed-in role, or null when signed out. */
  role: Role | null;
  /** Changes when a different user signs in on this tab, forcing a fresh module. */
  userId: string | null;
  modules: RoleModules;
  /** Rendered when signed out (owns its own router for /login). */
  login: React.ReactNode;
  landing: React.ReactNode;
}

/** Mounts exactly one role module under its base path, or the login tree when signed out. */
export function RoleRouter({ role, userId, modules, login, landing }: RoleRouterProps) {
  // Back/forward can land outside the role's base path (e.g. another role's URL left in this tab's history).
  // The module's router may already have captured that foreign URL — its popstate listener can run before
  // ours — so after correcting the URL we remount the module (epoch in its key) to make it re-read it.
  const [epoch, bumpEpoch] = useReducer((n: number) => n + 1, 0);
  const roleRef = useRef(role);
  roleRef.current = role;
  useEffect(() => {
    const onPopState = () => {
      if (resolveRoute(roleRef.current, window.location.pathname).redirectTo) bumpEpoch();
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const decision = resolveRoute(role, window.location.pathname);
  if (decision.redirectTo) window.history.replaceState(null, '', decision.redirectTo);

  if (decision.module === 'login') return <>{login}</>;
  if (decision.module === 'landing') return <>{landing}</>;

  const Module = modules[decision.module];
  return <Module key={`${userId ?? ''}:${epoch}`} basename={ROLE_BASE_PATH[decision.module]} />;
}
