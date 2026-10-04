import { fail } from "../common/api-error";
import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Role } from "../generated/prisma/client";
import { AuthenticatedRequest } from "./auth.types";
import { ROLES_KEY } from "./roles.decorator";

/** Apply after JwtAuthGuard. Roles are the internal Prisma enum values. */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const user = context.switchToHttp().getRequest<AuthenticatedRequest>().user;
    if (!user) fail(401, "UNAUTHORIZED", "Authentication is required.");
    const roles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (roles?.length && !roles.includes(user.role))
      fail(403, "FORBIDDEN", "This role cannot perform that action.");
    return true;
  }
}
