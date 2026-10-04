import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import type { RequestUser } from './request-user';
import { objectBody, text } from '../common/validation';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService) {}
  async login(input: unknown) {
    const body = objectBody(input, ['email', 'password']);
    const email = text(body.email, 'email', 254).toLowerCase();
    const password = text(body.password, 'password', 256, false);
    const user = await this.prisma.user.findUnique({ where: { email } });
    // Perform a bcrypt comparison even when the account does not exist.
    const dummy = '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';
    const valid = await bcrypt.compare(password, user?.passwordHash ?? dummy);
    if (!user?.active || !valid) throw new UnauthorizedException({ code: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect.' });
    const expires = process.env.JWT_EXPIRES_IN ?? '12h';
    const match = /^(\d+)([smhd])?$/.exec(expires);
    if (!match) throw new Error('JWT_EXPIRES_IN must be seconds or a duration such as 12h.');
    const seconds = Number(match[1]) * ({ s: 1, m: 60, h: 3600, d: 86400 }[match[2] ?? 's'] ?? 1);
    const token = await this.jwt.signAsync({ sub: user.id }, { expiresIn: seconds, algorithm: 'HS256' });
    return { token, user: this.publicUser(user) };
  }
  publicUser(user: RequestUser) {
    return { id: user.id, name: user.name, email: user.email, role: user.role.toLowerCase(),
      outletId: user.outletId, depotId: user.depotId, vehicleId: user.vehicleId };
  }
}
