import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import bcrypt from "bcrypt";
import { UsersService } from "../users/users.service";
import { publicUser } from "../users/public-user.mapper";
import { fail } from "../common/api-error";
import type { User } from "../generated/prisma/client";
import type { SessionUser } from "@waypoint/contracts";

export type Actor = Pick<
  User,
  "id" | "role" | "depotId" | "vehicleId" | "outletId"
>;
@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) {}
  view(user: User): SessionUser {
    return publicUser(user);
  }
  async login(input: unknown) {
    const body = input as { email?: unknown; password?: unknown } | null;
    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body) ||
      typeof body.email !== "string" ||
      typeof body.password !== "string" ||
      !body.email.trim() ||
      !body.password ||
      body.password.length > 256
    )
      fail(400, "INVALID_INPUT", "Email and password are required.");
    const user = await this.users.findByEmail(body.email.trim().toLowerCase());
    if (
      !user ||
      !user.active ||
      !(await bcrypt.compare(body.password, user.passwordHash))
    )
      fail(401, "INVALID_CREDENTIALS", "Invalid email or password.");
    const token = await this.jwt.signAsync({ sub: user.id });
    const claims = this.jwt.decode<{ exp: number }>(token);
    return {
      token,
      expiresAt: new Date(claims.exp * 1000).toISOString(),
      user: this.view(user),
    };
  }
  async authenticate(header?: string): Promise<User> {
    const match =
      typeof header === "string" ? /^Bearer ([^\s]+)$/i.exec(header) : null;
    if (!match) fail(401, "UNAUTHORIZED", "A bearer token is required.");
    let sub: string;
    try {
      const claims = await this.jwt.verifyAsync<{ sub: string; exp: number }>(
        match[1],
      );
      if (
        typeof claims.sub !== "string" ||
        !claims.sub ||
        !Number.isFinite(claims.exp)
      )
        throw new Error("Missing subject");
      sub = claims.sub;
    } catch {
      fail(401, "UNAUTHORIZED", "Invalid or expired session.");
    }
    const user = await this.users.findById(sub);
    if (!user?.active)
      fail(401, "UNAUTHORIZED", "Account is inactive or missing.");
    return user;
  }
}
