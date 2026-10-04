import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import type { RequestUser } from './request-user';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService, private readonly prisma: PrismaService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ headers: { authorization?: string }; user?: RequestUser }>();
    const match = /^Bearer ([^ ]+)$/i.exec(request.headers.authorization ?? '');
    if (!match) throw new UnauthorizedException({ code: 'AUTH_REQUIRED', message: 'Sign in to continue.' });
    let id: string;
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string }>(match[1], { algorithms: ['HS256'] });
      if (typeof payload.sub !== 'string' || !payload.sub) throw new Error('Invalid subject');
      id = payload.sub;
    } catch {
      throw new UnauthorizedException({ code: 'INVALID_TOKEN', message: 'Your session has expired. Sign in again.' });
    }
    const user = await this.prisma.user.findUnique({ where: { id }, select: {
      id: true, email: true, name: true, role: true, outletId: true, depotId: true, vehicleId: true, active: true,
    } });
    if (!user?.active) throw new UnauthorizedException({ code: 'INVALID_TOKEN', message: 'This account is unavailable.' });
    const { active: _active, ...publicUser } = user;
    request.user = publicUser;
    return true;
  }
}

@Injectable()
export class StoreManagerGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const user = context.switchToHttp().getRequest<{ user?: RequestUser }>().user;
    if (user?.role !== 'STORE_MANAGER' || !user.outletId) {
      throw new ForbiddenException({ code: 'STORE_ACCESS_REQUIRED', message: 'A Store Manager account with an assigned outlet is required.' });
    }
    return true;
  }
}
