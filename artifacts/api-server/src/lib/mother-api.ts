const DEFAULT_TIMEOUT_MS = 2200;

export type UnknownRecord = Record<string, unknown>;
export type ApiResult<T> = { ok: true; status: number; data: T } | { ok: false; status?: number; error: string };

function normalizeBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

const rawMotherBaseUrl = process.env.UNIXSEE_MOTHER_BASE_URL || "http://127.0.0.1:8732";
export const motherBaseUrl = normalizeBaseUrl(rawMotherBaseUrl);

function safeErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    if (err.name === "AbortError") return "Request timed out";
    return err.message.replace(/\s+at\s+.*/gs, "").slice(0, 220) || "Request failed";
  }
  return "Request failed";
}

export function encodePathPart(value: string): string {
  return encodeURIComponent(value.trim()).replace(/%2F/gi, "");
}

export async function safeFetchJson<T>(path: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<ApiResult<T>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${motherBaseUrl}${path}`, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });

    const text = await res.text();
    let data: unknown = null;
    if (text.trim() !== "") {
      try {
        data = JSON.parse(text);
      } catch {
        data = { raw: text.slice(0, 500) };
      }
    }

    if (!res.ok) {
      const error = typeof data === "object" && data !== null && "error" in data ? String((data as { error?: unknown }).error || `HTTP ${res.status}`) : `HTTP ${res.status}`;
      return { ok: false, status: res.status, error };
    }

    return { ok: true, status: res.status, data: data as T };
  } catch (err) {
    return { ok: false, error: safeErrorMessage(err) };
  } finally {
    clearTimeout(timer);
  }
}

export async function postMotherJson<T>(path: string, body: unknown, timeoutMs = DEFAULT_TIMEOUT_MS, actorHeaders: Record<string, string> = {}): Promise<ApiResult<T>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${motherBaseUrl}${path}`, {
      method: "POST",
      cache: "no-store",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(process.env.UNIXSEE_MOTHER_MANAGEMENT_TOKEN ? { Authorization: `Bearer ${process.env.UNIXSEE_MOTHER_MANAGEMENT_TOKEN}` } : {}),
        ...actorHeaders,
      },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    let data: unknown = null;
    if (text.trim() !== "") {
      try {
        data = JSON.parse(text);
      } catch {
        data = { raw: text.slice(0, 500) };
      }
    }
    if (!res.ok) {
      const error = typeof data === "object" && data !== null && "error" in data ? String((data as { error?: unknown }).error || `HTTP ${res.status}`) : `HTTP ${res.status}`;
      return { ok: false, status: res.status, error };
    }
    return { ok: true, status: res.status, data: data as T };
  } catch (err) {
    return { ok: false, error: safeErrorMessage(err) };
  } finally {
    clearTimeout(timer);
  }
}
