import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { publicUser } from '../users/public-user.mapper';

/** Login, JWT issue/verify, role guards (DISPATCHER, LOADER, DRIVER, STORE_MANAGER). */
@Injectable()
export class AuthService {
  constructor(private readonly users: UsersService, private readonly jwt: JwtService) {}

  async login(body: unknown) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new BadRequestException('Email and password are required');
    }
    const { email, password } = body as Record<string, unknown>;
    if (typeof email !== 'string' || !email.trim() || typeof password !== 'string' || !password) {
      throw new BadRequestException('Email and password are required');
    }
    const user = await this.users.findByEmail(email.trim().toLowerCase());
    const matches = user ? await bcrypt.compare(password, user.passwordHash) : false;
    if (!user || !matches || !user.active) {
      throw new UnauthorizedException('Email or password is incorrect');
    }
    return { token: await this.jwt.signAsync({ sub: user.id }), user: publicUser(user) };
  }

  async authenticate(token: string) {
    let payload: { sub?: unknown; exp?: unknown };
    try {
      payload = await this.jwt.verifyAsync(token);
      if (!payload || typeof payload.sub !== 'string' || !payload.sub ||
          typeof payload.exp !== 'number' || !Number.isFinite(payload.exp)) {
        throw new Error('Invalid token payload');
      }
    } catch {
      throw new UnauthorizedException('Invalid or expired authentication');
    }
    const user = await this.users.findById(payload.sub as string);
    if (!user?.active) throw new UnauthorizedException('Invalid or expired authentication');
    return user;
  }
}
