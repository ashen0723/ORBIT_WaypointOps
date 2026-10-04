import { apiFetch, ApiError } from "./client";
import type { LoginResponse, SessionUser } from "@waypoint/contracts";
export type AuthUser = SessionUser;
export type AuthSession = LoginResponse;
export function isAuthUser(value: unknown): value is SessionUser {
  if (!value || typeof value !== "object") return false;
  const u = value as Record<string, unknown>;
  return (
    ["id", "email", "name"].every((k) => typeof u[k] === "string") &&
    ["dispatcher", "loader", "driver", "store_manager"].includes(
      String(u.role),
    ) &&
    ["outletId", "depotId", "vehicleId"].every(
      (k) => u[k] === null || typeof u[k] === "string",
    )
  );
}
export function tokenExpiry(token: string): number {
  try {
    const segment = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const exp = JSON.parse(atob(segment)).exp;
    return typeof exp === "number" && Number.isFinite(exp) ? exp * 1000 : NaN;
  } catch {
    return NaN;
  }
}
export async function login(
  email: string,
  password: string,
): Promise<AuthSession> {
  const result = await apiFetch<AuthSession>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
  });
  if (
    !result ||
    typeof result.token !== "string" ||
    !isAuthUser(result.user) ||
    !Number.isFinite(Date.parse(result.expiresAt)) ||
    !Number.isFinite(tokenExpiry(result.token))
  )
    throw new ApiError(
      200,
      "INVALID_RESPONSE",
      "The server returned an invalid session.",
    );
  return result;
}
export async function currentUser(
  token: string,
  signal?: AbortSignal,
): Promise<AuthUser> {
  const user = await apiFetch<AuthUser>("/auth/me", { token, signal });
  if (!isAuthUser(user))
    throw new ApiError(
      200,
      "INVALID_RESPONSE",
      "The server returned an invalid user.",
    );
  return user;
}
