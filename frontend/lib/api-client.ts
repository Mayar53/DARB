import { useAuthStore } from "@/stores/auth.store";

import { env } from "./env";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  /** Attach the access token (default true). Set false for public endpoints. */
  auth?: boolean;
}

const BASE_URL = env.NEXT_PUBLIC_API_URL;

async function rawFetch(path: string, init: RequestInit, token?: string): Promise<Response> {
  return fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
}

/** Try to refresh the access token once using the stored refresh token. */
async function tryRefresh(): Promise<boolean> {
  const { refreshToken, setTokens, clear } = useAuthStore.getState();
  if (!refreshToken) return false;

  const res = await rawFetch("/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!res.ok) {
    clear();
    return false;
  }
  const data = (await res.json()) as { access_token: string; refresh_token: string };
  setTokens(data.access_token, data.refresh_token);
  return true;
}

/**
 * Render an API `detail` payload as a readable message.
 *
 * django-ninja reports validation failures as `detail: [{ loc, msg }, ...]`,
 * and `String()` on that array collapses to "[object Object]" — useless in a
 * toast. Flatten it into "field: message" pairs instead.
 */
function formatErrorDetail(detail: unknown): string | null {
  if (typeof detail === "string") return detail || null;
  if (Array.isArray(detail)) {
    const parts = detail.map((item) => {
      if (!item || typeof item !== "object") return String(item);
      const { loc, msg } = item as { loc?: unknown; msg?: unknown };
      const message = msg !== undefined ? String(msg) : JSON.stringify(item);
      const field = Array.isArray(loc)
        ? loc.filter((part) => part !== "body" && part !== "payload").join(".")
        : "";
      return field ? `${field}: ${message}` : message;
    });
    return parts.length > 0 ? parts.join("; ") : null;
  }
  if (detail && typeof detail === "object") return JSON.stringify(detail);
  return null;
}

/**
 * Single fetch wrapper used by every feature's api module (DRY).
 * Injects the JWT, transparently refreshes once on 401, and throws ApiError.
 */
async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, auth = true, ...rest } = options;
  const init: RequestInit = {
    ...rest,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  };

  const token = auth ? (useAuthStore.getState().accessToken ?? undefined) : undefined;
  let res = await rawFetch(path, init, token);

  if (res.status === 401 && auth && !path.startsWith("/auth/refresh")) {
    if (await tryRefresh()) {
      res = await rawFetch(path, init, useAuthStore.getState().accessToken ?? undefined);
    }
  }

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    const detail = data && typeof data === "object" && "detail" in data ? data.detail : null;
    throw new ApiError(res.status, formatErrorDetail(detail) ?? res.statusText, data);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "POST", body }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "PUT", body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "PATCH", body }),
  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "DELETE" }),
};
