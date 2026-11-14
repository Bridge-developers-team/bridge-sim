/** Same origin as the page: the backend serves this app, and in dev Vite
 * proxies /api to it. So no base URL and no CORS. */

export class ApiError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const NETWORK_ERROR = "Could not reach Bridge. Check your connection and try again.";

/** Said when the server gave no usable reason. Never `statusText`: HTTP/2 has
 * no reason phrase, so it is always empty in production. */
function fallbackMessage(status: number): string {
  if (status === 404) return "Not found.";
  if (status === 429) return "Too many requests. Wait a minute and try again.";
  if (status >= 500) return "Something went wrong on our side. Try again.";
  return `Request failed (${status}).`;
}

async function failure(response: Response): Promise<ApiError> {
  let message: string | null = null;
  try {
    const body = (await response.json()) as { detail?: unknown };
    if (typeof body.detail === "string" && body.detail) message = body.detail;
  } catch {
    // not JSON: the fallback speaks for it
  }
  return new ApiError(response.status, message ?? fallbackMessage(response.status));
}

async function request<T>(path: string, init: { method?: string; body?: unknown; headers?: Record<string, string> } = {}): Promise<T> {
  const headers: Record<string, string> = { ...init.headers };
  if (init.body !== undefined) headers["Content-Type"] = "application/json";
  let response: Response;
  try {
    response = await fetch(path, {
      method: init.method ?? "GET",
      headers,
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
  } catch {
    throw new ApiError(0, NETWORK_ERROR);
  }
  if (!response.ok) throw await failure(response);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) => request<T>(path, { method: "POST", body }),
  delete: (path: string, headers: Record<string, string>) => request<void>(path, { method: "DELETE", headers }),
};
