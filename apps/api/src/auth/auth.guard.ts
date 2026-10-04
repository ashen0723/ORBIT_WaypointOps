import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import type { Request } from "express";
import type { User } from "../generated/prisma/client";
import { AuthService } from "./auth.service";
import { RolesGuard } from "./roles.guard";
export { Roles } from "./roles.decorator";
export type AuthRequest = Request & { user: User };
/** Compatibility entry point for existing planning/workflow controllers. */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly auth: AuthService,
    private readonly roles: RolesGuard,
  ) {}
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthRequest>();
    request.user = await this.auth.authenticate(request.headers.authorization);
    return this.roles.canActivate(context);
  }
}
