/** Base URL for the NestJS API. In Docker and in Vite dev, `/api` is proxied to the api service. */
export const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "/api";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details: unknown = null,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface ApiRequestInit extends RequestInit {
  token?: string | null;
}

/** JSON fetch against the real backend. Throws ApiError with the server's code/message on non-2xx. */
export async function apiFetch<T>(
  path: string,
  init: ApiRequestInit = {},
): Promise<T> {
  const { token, headers, ...rest } = init;
  const requestHeaders = new Headers(headers);
  if (!requestHeaders.has("Accept"))
    requestHeaders.set("Accept", "application/json");
  if (
    rest.body !== undefined &&
    !(rest.body instanceof FormData) &&
    !requestHeaders.has("Content-Type")
  )
    requestHeaders.set("Content-Type", "application/json");
  if (token) requestHeaders.set("Authorization", `Bearer ${token}`);
  const res = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers: requestHeaders,
  });
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    if (res.ok)
      throw new ApiError(
        res.status,
        "INVALID_RESPONSE",
        "The server returned an unreadable response. Retry when available.",
      );
  }
  if (!res.ok) {
    const error =
      body && typeof body === "object" && !Array.isArray(body)
        ? (body as Record<string, unknown>)
        : {};
    const message =
      typeof error.message === "string"
        ? error.message
        : Array.isArray(error.message)
          ? error.message.filter((v) => typeof v === "string").join(" ")
          : res.statusText;
    throw new ApiError(
      res.status,
      typeof error.code === "string" ? error.code : "HTTP_ERROR",
      message,
      error.details ?? null,
    );
  }
  return body as T;
}
