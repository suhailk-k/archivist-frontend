export interface ApiError {
  code: string;
  message: string;
}

export class ApiRequestError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(status: number, error: ApiError) {
    super(error.message);
    this.name = "ApiRequestError";
    this.status = status;
    this.code = error.code;
  }
}

const BACKEND_PORT = 3001;

/**
 * The session cookie is SameSite=Strict, and the browser treats `localhost` and `127.0.0.1` as
 * different sites — hitting one from a page served by the other sets the cookie but never sends
 * it back. Default to whatever hostname the page came from so the cookie stays same-site.
 */
function defaultApiBaseUrl(): string {
  if (typeof window === "undefined") return `http://127.0.0.1:${BACKEND_PORT}`;
  return `${window.location.protocol}//${window.location.hostname}:${BACKEND_PORT}`;
}

const API_BASE_URL = import.meta.env["VITE_API_URL"] ?? defaultApiBaseUrl();

type UnauthorizedHandler = () => void;

let onUnauthorized: UnauthorizedHandler | null = null;

/** Registers the single session-expiry handler. AuthProvider owns it. */
export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  onUnauthorized = handler;
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...init.headers,
      },
    });
  } catch {
    throw new ApiRequestError(0, { code: "NETWORK_ERROR", message: "Archivist backend is unreachable." });
  }

  let body: { success?: boolean; data?: T; error?: ApiError };
  try {
    body = (await response.json()) as { success?: boolean; data?: T; error?: ApiError };
  } catch {
    throw new ApiRequestError(response.status, { code: "BAD_RESPONSE", message: "Backend returned an invalid response." });
  }

  if (!response.ok || !body.success) {
    // The session-expiry path never fires for the probe that establishes the session.
    if (response.status === 401 && path !== "/api/auth/me") onUnauthorized?.();
    throw new ApiRequestError(response.status, body.error ?? { code: "UNKNOWN", message: "Request failed." });
  }
  return body.data as T;
}

export function apiGet<T>(path: string): Promise<T> {
  return apiRequest<T>(path);
}

export function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const init: RequestInit = { method: "POST" };
  if (body !== undefined) init.body = JSON.stringify(body);
  return apiRequest<T>(path, init);
}
