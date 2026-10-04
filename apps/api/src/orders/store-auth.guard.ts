import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { Role } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface StoreUser {
  id: string;
  outletId: string;
}

export interface StoreRequest extends Request {
  storeUser: StoreUser;
}

/** Scoped to Store endpoints until the platform auth module exposes its shared guard. */
@Injectable()
export class StoreAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService, private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<StoreRequest>();
    const match = /^Bearer\s+(.+)$/i.exec(request.headers.authorization ?? '');
    if (!match) throw new UnauthorizedException({ code: 'AUTH_REQUIRED', message: 'Sign in to continue.', details: [] });

    let userId: string;
    try {
      const payload = await this.jwt.verifyAsync<{ sub?: unknown }>(match[1], { secret: process.env.JWT_SECRET });
      if (typeof payload.sub !== 'string' || !payload.sub) throw new Error('Missing subject');
      userId = payload.sub;
    } catch {
      throw new UnauthorizedException({ code: 'INVALID_TOKEN', message: 'Your session is invalid or expired.', details: [] });
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, active: true, outletId: true },
    });
    if (!user) throw new UnauthorizedException({ code: 'INVALID_TOKEN', message: 'Your session is invalid or expired.', details: [] });
    if (!user.active || user.role !== Role.STORE_MANAGER || !user.outletId) {
      throw new ForbiddenException({ code: 'STORE_ACCESS_DENIED', message: 'Store Manager access is required.', details: [] });
    }
    request.storeUser = { id: user.id, outletId: user.outletId };
    return true;
  }
}
