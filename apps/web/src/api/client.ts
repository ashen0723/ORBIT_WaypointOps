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
  const res = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers: {
      Accept: 'application/json',
      ...(rest.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new ApiError(res.status, body?.code ?? 'HTTP_ERROR', body?.message ?? res.statusText, body?.details ?? null);
  }
  return body as T;
}
