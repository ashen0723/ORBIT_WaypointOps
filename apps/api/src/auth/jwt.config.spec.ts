import { ConfigService } from "@nestjs/config";
import { jwtOptions } from "./jwt.config";

describe("JWT configuration", () => {
  it("requires a nonblank secret", () => {
    for (const JWT_SECRET of [
      undefined,
      "",
      " ",
      "short",
      "replace-with-a-long-random-value",
      " ".repeat(32),
    ]) {
      expect(() => jwtOptions(new ConfigService({ JWT_SECRET }))).toThrow(
        "JWT_SECRET",
      );
    }
  });
  it("defaults to 12h and restricts verification to HS256", () => {
    expect(
      jwtOptions(
        new ConfigService({
          JWT_SECRET: "test-only-auth-secret-at-least-32-characters",
        }),
      ),
    ).toEqual({
      secret: "test-only-auth-secret-at-least-32-characters",
      signOptions: { algorithm: "HS256", expiresIn: "12h" },
      verifyOptions: { algorithms: ["HS256"] },
    });
  });
  it.each(["15m", "7d", "12h", "3600"])(
    "accepts configured expiry %s",
    (JWT_EXPIRES_IN) => {
      expect(
        jwtOptions(
          new ConfigService({
            JWT_SECRET: "test-only-auth-secret-at-least-32-characters",
            JWT_EXPIRES_IN,
          }),
        ).signOptions?.expiresIn,
      ).toBe(JWT_EXPIRES_IN === "3600" ? 3600 : JWT_EXPIRES_IN);
    },
  );
  it.each(["", "invalid", "0", "-1h", "1ms", "999ms", "9".repeat(400)])(
    "rejects invalid expiry %s",
    (JWT_EXPIRES_IN) => {
      expect(() =>
        jwtOptions(
          new ConfigService({
            JWT_SECRET: "test-only-auth-secret-at-least-32-characters",
            JWT_EXPIRES_IN,
          }),
        ),
      ).toThrow("JWT_EXPIRES_IN");
    },
  );
});
