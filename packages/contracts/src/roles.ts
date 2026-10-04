/** Role identifiers as used by the Designathon prototypes (lowercase). The API's Prisma enum is uppercase. */
export type Role = 'dispatcher' | 'loader' | 'driver' | 'store_manager';

export const ROLES: readonly Role[] = ['dispatcher', 'loader', 'driver', 'store_manager'];

/** URL prefix each role's module is mounted under in apps/web. */
export const ROLE_BASE_PATH: Record<Role, string> = {
  dispatcher: '/dispatcher',
  store_manager: '/store',
  loader: '/loader',
  driver: '/driver',
};

export const LOGIN_PATH = '/login';
