import { ConfigService } from "@nestjs/config";
import { JwtModuleOptions } from "@nestjs/jwt";

export function jwtOptions(config: ConfigService): JwtModuleOptions {
  const secret = config.get<string>("JWT_SECRET");
  if (
    typeof secret !== "string" ||
    secret.trim().length < 32 ||
    secret === "replace-with-a-long-random-value"
  )
    throw new Error(
      "JWT_SECRET must be a non-placeholder secret of at least 32 characters",
    );
  const expiresIn = config.get<string>("JWT_EXPIRES_IN") ?? "12h";
  // Accept positive durations in the documented format, or positive integer seconds.
  if (!/^[1-9]\d*(?:ms|s|m|h|d|w|y)?$/.test(expiresIn)) {
    throw new Error(
      "JWT_EXPIRES_IN must be a positive duration such as 15m or 12h",
    );
  }
  const units: Record<string, number> = {
    ms: 0.001,
    s: 1,
    m: 60,
    h: 3600,
    d: 86400,
    w: 604800,
    y: 31557600,
  };
  const parts = /^(\d+)(ms|s|m|h|d|w|y)?$/.exec(expiresIn)!;
  const seconds = Number(parts[1]) * (units[parts[2]] ?? 1);
  if (
    !Number.isFinite(seconds) ||
    seconds < 1 ||
    seconds > Number.MAX_SAFE_INTEGER - Math.floor(Date.now() / 1000)
  )
    throw new Error(
      "JWT_EXPIRES_IN must represent at least one second and a finite expiry",
    );
  return {
    secret,
    signOptions: {
      algorithm: "HS256",
      expiresIn: /^\d+$/.test(expiresIn)
        ? Number(expiresIn)
        : (expiresIn as NonNullable<
            JwtModuleOptions["signOptions"]
          >["expiresIn"]),
    },
    verifyOptions: { algorithms: ["HS256"] },
  };
}
