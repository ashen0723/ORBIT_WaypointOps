import type { ReactNode } from "react";
import type { Role } from "@waypoint/contracts";
import { useAuth } from "../../app/providers/AuthProvider";
/** The root router handles navigation; API guards recheck the active account on every request. */
export function RequireRole({
  roles,
  children,
}: {
  roles: Role[];
  children: ReactNode;
}) {
  const { user } = useAuth();
  if (!user) return <p role="status">Sign in to continue.</p>;
  if (!roles.includes(user.role))
    return <p role="alert">Your account cannot access this workspace.</p>;
  return <>{children}</>;
}
