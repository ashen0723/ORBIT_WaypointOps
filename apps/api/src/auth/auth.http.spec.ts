import { Controller, Get, INestApplication, UseGuards } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Test } from "@nestjs/testing";
import bcrypt from "bcrypt";
import { AddressInfo } from "node:net";
import { AuthModule } from "./auth.module";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { RolesGuard } from "./roles.guard";
import { Roles } from "./roles.decorator";
import { AuthGuard, Roles as WorkflowRoles } from "./auth.guard";
import { PrismaService } from "../prisma/prisma.service";
import { PrismaModule } from "../prisma/prisma.module";
import { Role, User } from "../generated/prisma/client";

@Controller("auth-test")
@UseGuards(JwtAuthGuard, RolesGuard)
class RoleTestController {
  @Get("dispatcher")
  @Roles(Role.DISPATCHER)
  dispatcher() {
    return { ok: true };
  }
}

@Controller("workflow-auth-test")
@UseGuards(AuthGuard)
@Roles(Role.DISPATCHER)
class WorkflowRoleTestController {
  @Get("dispatcher")
  dispatcher() {
    return { ok: true };
  }
  @Get("loader")
  @WorkflowRoles(Role.LOADER)
  loader() {
    return { ok: true };
  }
}

describe("Authentication HTTP contract (mocked Prisma)", () => {
  let app: INestApplication;
  let base: string;
  let jwt: JwtService;
  let users: User[];
  const findUnique = jest.fn(
    async ({ where }: { where: { email?: string; id?: string } }) =>
      users.find((user) =>
        where.id ? user.id === where.id : user.email === where.email,
      ) ?? null,
  );

  beforeAll(async () => {
    const passwordHash = await bcrypt.hash("waypoint-demo", 10);
    users = [Role.DISPATCHER, Role.LOADER, Role.DRIVER, Role.STORE_MANAGER].map(
      (role, index) => ({
        id: `USR-${index}`,
        email: `${role.toLowerCase()}@waypoint.lk`,
        name: "Demo User",
        role,
        passwordHash,
        active: true,
        outletId: null,
        depotId: null,
        vehicleId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    );
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          ignoreEnvFile: true,
          skipProcessEnv: true,
          load: [
            () => ({
              JWT_SECRET: "test-only-auth-secret-at-least-32-characters",
              JWT_EXPIRES_IN: "12h",
            }),
          ],
        }),
        PrismaModule,
        AuthModule,
      ],
      controllers: [RoleTestController, WorkflowRoleTestController],
    })
      .overrideProvider(PrismaService)
      .useValue({ user: { findUnique } })
      .compile();
    app = module.createNestApplication();
    app.setGlobalPrefix("api");
    await app.listen(0, "127.0.0.1");
    base = `http://127.0.0.1:${(app.getHttpServer().address() as AddressInfo).port}/api`;
    jwt = module.get(JwtService);
  });

  afterAll(async () => {
    await app?.close();
  });
  afterEach(() => {
    users.forEach((user) => {
      user.active = true;
    });
  });

  async function login(email = users[0].email, password = "waypoint-demo") {
    return fetch(`${base}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
  }
  async function get(path: string, authorization?: string) {
    return fetch(`${base}${path}`, {
      headers: authorization ? { Authorization: authorization } : {},
    });
  }

  it.each([
    [0, "dispatcher"],
    [1, "loader"],
    [2, "driver"],
    [3, "store_manager"],
  ])(
    "logs in seeded-style role %s without exposing the hash",
    async (index, role) => {
      const response = await login(users[index as number].email);
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(Object.keys(body).sort()).toEqual(["expiresAt", "token", "user"]);
      expect(body.user).toEqual({
        id: users[index as number].id,
        email: users[index as number].email,
        name: "Demo User",
        role,
        outletId: null,
        depotId: null,
        vehicleId: null,
      });
      expect(JSON.stringify(body)).not.toContain("passwordHash");
      const payload = jwt.verify(body.token);
      expect(body.expiresAt).toBe(new Date(payload.exp * 1000).toISOString());
      expect(payload.sub).toBe(users[index as number].id);
      expect(payload.exp - payload.iat).toBe(12 * 3600);
    },
  );

  it("trims and lowercases email", async () => {
    expect((await login(`  ${users[0].email.toUpperCase()}  `)).status).toBe(
      200,
    );
  });

  it("returns the same 401 response for wrong password, unknown user and inactive user", async () => {
    const wrong = await login(users[0].email, "wrong");
    const unknown = await login("unknown@waypoint.lk");
    users[0].active = false;
    const inactive = await login();
    expect([wrong.status, unknown.status, inactive.status]).toEqual([
      401, 401, 401,
    ]);
    expect(await unknown.json()).toEqual(await wrong.json());
    expect(await inactive.json()).toEqual({
      code: "INVALID_CREDENTIALS",
      message: "Invalid email or password.",
      details: [],
    });
  });

  it.each([
    {},
    { email: 42, password: "demo" },
    { email: " ", password: "demo" },
    { email: "demo", password: "" },
    { email: "demo", password: "x".repeat(257) },
    [],
    null,
  ])("validates input at runtime: %j", async (body) => {
    const response = await fetch(`${base}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    expect(response.status).toBe(400);
  });

  it("returns the current database user from /me", async () => {
    const { token } = await (await login()).json();
    users[0].name = "Updated Name";
    const response = await get("/auth/me", `Bearer ${token}`);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.name).toBe("Updated Name");
    expect(body).not.toHaveProperty("passwordHash");
  });

  it.each([undefined, "Basic abc", "Bearer", "Bearer a b", "Bearer not-a-jwt"])(
    "rejects missing/malformed authentication: %s",
    async (header) => {
      expect((await get("/auth/me", header)).status).toBe(401);
    },
  );

  it("rejects expired, invalid-signature, missing-sub, missing-exp and unknown-user JWTs", async () => {
    const tokens = [
      jwt.sign({ sub: users[0].id }, { expiresIn: -1 }),
      jwt.sign({ sub: users[0].id }, { secret: "wrong-secret" }),
      jwt.sign({}),
      jwt.sign({ sub: "" }),
      jwt.sign({ sub: users[0].id }, { algorithm: "HS384" }),
      jwt.sign({ sub: "missing-user" }),
      new JwtService({
        secret: "test-only-auth-secret-at-least-32-characters",
      }).sign({ sub: users[0].id }),
    ];
    for (const token of tokens)
      expect((await get("/auth/me", `Bearer ${token}`)).status).toBe(401);
  });

  it("preserves the current guard and both role-decorator import paths", async () => {
    const dispatcher = (await (await login()).json()).token;
    const loader = (await (await login(users[1].email)).json()).token;
    expect(
      (await get("/workflow-auth-test/dispatcher", `bearer ${dispatcher}`))
        .status,
    ).toBe(200);
    expect(
      (await get("/workflow-auth-test/dispatcher", `Bearer ${loader}`)).status,
    ).toBe(403);
    expect(
      (await get("/workflow-auth-test/loader", `Bearer ${loader}`)).status,
    ).toBe(200);
    expect(
      (await get("/workflow-auth-test/loader", `Bearer ${dispatcher}`)).status,
    ).toBe(403);
    expect((await get("/workflow-auth-test/dispatcher")).status).toBe(401);
  });
  it("rejects a previously issued JWT after the account is deactivated", async () => {
    const { token } = await (await login()).json();
    users[0].active = false;
    expect((await get("/auth/me", `Bearer ${token}`)).status).toBe(401);
  });

  it("allows the required role, returns 403 for a changed role, and 401 without authentication", async () => {
    const { token } = await (await login()).json();
    expect((await get("/auth-test/dispatcher", `Bearer ${token}`)).status).toBe(
      200,
    );
    users[0].role = Role.LOADER;
    expect((await get("/auth-test/dispatcher", `Bearer ${token}`)).status).toBe(
      403,
    );
    users[0].role = Role.DISPATCHER;
    expect((await get("/auth-test/dispatcher")).status).toBe(401);
  });
});
