import type { SessionUser } from "@waypoint/contracts";
import type { Role, User } from "../generated/prisma/client";

const browserRoles = {
  STORE_MANAGER: "store_manager",
  DISPATCHER: "dispatcher",
  LOADER: "loader",
  DRIVER: "driver",
} as const satisfies Record<Role, string>;

export function publicUser(user: User): SessionUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: browserRoles[user.role],
    outletId: user.outletId,
    depotId: user.depotId,
    vehicleId: user.vehicleId,
  };
}

export type PublicUser = ReturnType<typeof publicUser>;
