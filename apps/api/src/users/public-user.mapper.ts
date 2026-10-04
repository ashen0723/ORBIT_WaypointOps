import type { Role, User } from '../generated/prisma/client';

const browserRoles = {
  STORE_MANAGER: 'store_manager',
  DISPATCHER: 'dispatcher',
  LOADER: 'loader',
  DRIVER: 'driver',
} as const satisfies Record<Role, string>;

export function publicUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: browserRoles[user.role],
    ...(user.outletId !== null ? { outletId: user.outletId } : {}),
    ...(user.depotId !== null ? { depotId: user.depotId } : {}),
    ...(user.vehicleId !== null ? { vehicleId: user.vehicleId } : {}),
  };
}

export type PublicUser = ReturnType<typeof publicUser>;
