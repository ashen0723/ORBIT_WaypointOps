/** Base URL for the NestJS API. In Docker and in Vite dev, `/api` is proxied to the api service. */
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details: unknown = null,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface ApiRequestInit extends RequestInit {
  token?: string | null;
}

/** JSON fetch against the real backend. Throws ApiError with the server's code/message on non-2xx. */
export async function apiFetch<T>(path: string, init: ApiRequestInit = {}): Promise<T> {
  const { token, headers, ...rest } = init;
  const requestHeaders = new Headers(headers);
  requestHeaders.set('Accept', 'application/json');
  if (rest.body !== undefined) requestHeaders.set('Content-Type', 'application/json');
  if (token) requestHeaders.set('Authorization', `Bearer ${token}`);
  const res = await fetch(`${API_BASE}${path}`, { ...rest, headers: requestHeaders });
  const text = await res.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; }
  catch {
    if (res.ok) throw new ApiError(res.status, 'INVALID_RESPONSE', 'The server returned an invalid response.');
  }
  if (!res.ok) {
    throw new ApiError(res.status, body?.code ?? 'HTTP_ERROR', body?.message ?? res.statusText, body?.details ?? null);
  }
  return body as T;
}
