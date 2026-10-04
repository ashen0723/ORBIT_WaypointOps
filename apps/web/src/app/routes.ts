import { LOGIN_PATH, ROLE_BASE_PATH, type Role } from '@waypoint/contracts';

export interface RouteDecision {
  /** Path to replace the current URL with before rendering, or null to stay. */
  redirectTo: string | null;
  /** Which tree the root should render: the login screen or one role's module. */
  module: Role | 'login';
}

function isInside(pathname: string, base: string): boolean {
  return pathname === base || pathname.startsWith(`${base}/`);
}

/** Decide what the root renders for the signed-in role (or null when signed out) and the current path. */
export function resolveRoute(role: Role | null, pathname: string): RouteDecision {
  if (!role) {
    return { redirectTo: pathname === LOGIN_PATH ? null : LOGIN_PATH, module: 'login' };
  }
  const base = ROLE_BASE_PATH[role];
  return { redirectTo: isInside(pathname, base) ? null : base, module: role };
}
