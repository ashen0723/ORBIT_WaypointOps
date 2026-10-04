import { CanActivate, ExecutionContext, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { User, Role } from '../generated/prisma/client';
import { AuthService } from './auth.service';
import { fail } from '../common/api-error';
export const Roles = (...roles: Role[]) => SetMetadata('waypoint.roles', roles);
export type AuthRequest = Request & { user: User };
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly auth: AuthService, private readonly reflector: Reflector) {}
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthRequest>();
    request.user = await this.auth.authenticate(request.headers.authorization);
    const roles = this.reflector.getAllAndOverride<Role[]>('waypoint.roles', [context.getHandler(), context.getClass()]);
    if (roles && !roles.includes(request.user.role)) fail(403, 'FORBIDDEN', 'This role cannot perform that action.');
    return true;
  }
}
