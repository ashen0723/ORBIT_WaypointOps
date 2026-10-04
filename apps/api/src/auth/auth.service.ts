import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { fail } from '../common/api-error';
import type { User } from '../generated/prisma/client';
import type { SessionUser, Role } from '@waypoint/contracts';

export type Actor = Pick<User, 'id' | 'role' | 'depotId' | 'vehicleId' | 'outletId'>;
@Injectable()
export class AuthService {
  constructor(private readonly db: PrismaService, private readonly jwt: JwtService) {}
  private secret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret || secret === 'replace-with-a-long-random-value' || secret.length < 32) {
      fail(503, 'AUTH_NOT_CONFIGURED', 'Configure JWT_SECRET with at least 32 characters.');
    }
    return secret;
  }
  view(user: User): SessionUser {
    return { id: user.id, name: user.name, email: user.email, role: user.role.toLowerCase() as Role,
      outletId: user.outletId, depotId: user.depotId, vehicleId: user.vehicleId };
  }
  async login(input: unknown) {
    const body = input as { email?: unknown; password?: unknown } | null;
    if (!body || typeof body.email !== 'string' || typeof body.password !== 'string' ||
        !body.email.trim() || !body.password || body.password.length > 256) fail(400, 'INVALID_INPUT', 'Email and password are required.');
    const secret = this.secret();
    const user = await this.db.user.findUnique({ where: { email: body.email.trim().toLowerCase() } });
    if (!user || !user.active || !await bcrypt.compare(body.password, user.passwordHash)) fail(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
    const token = await this.jwt.signAsync({ sub: user.id }, { secret, expiresIn: (process.env.JWT_EXPIRES_IN ?? '12h') as '12h', algorithm: 'HS256' });
    const claims = this.jwt.decode<{ exp: number }>(token);
    return { token, expiresAt: new Date(claims.exp * 1000).toISOString(), user: this.view(user) };
  }
  async authenticate(header?: string): Promise<User> {
    if (!header?.startsWith('Bearer ')) fail(401, 'UNAUTHORIZED', 'A bearer token is required.');
    const secret = this.secret();
    let sub: string;
    try {
      const claims = await this.jwt.verifyAsync<{ sub: string }>(header.slice(7), { secret, algorithms: ['HS256'] });
      if (typeof claims.sub !== 'string') throw new Error('Missing subject');
      sub = claims.sub;
    } catch { fail(401, 'UNAUTHORIZED', 'Invalid or expired session.'); }
    const user = await this.db.user.findUnique({ where: { id: sub } });
    if (!user?.active) fail(401, 'UNAUTHORIZED', 'Account is inactive or missing.');
    return user;
  }
}
