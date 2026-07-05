import type { ApiResult } from "./types";

const API_BASE = `${import.meta.env.BASE_URL}api/`;

function apiUrl(path: string): string {
  return `${API_BASE}${path.replace(/^\/+/, "")}`;
}

async function parseResponse<T>(res: Response): Promise<ApiResult<T>> {
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
    const error =
      typeof data === "object" && data !== null && "error" in data
        ? String((data as { error?: unknown }).error || `HTTP ${res.status}`)
        : `HTTP ${res.status}`;
    return { ok: false, status: res.status, error };
  }
  return { ok: true, status: res.status, data: data as T };
}

export async function apiGet<T>(path: string, params?: Record<string, string | number | undefined>): Promise<ApiResult<T>> {
  let url = apiUrl(path);
  if (params) {
    const q = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== "") q.set(key, String(value));
    }
    const suffix = q.toString();
    if (suffix) url += `?${suffix}`;
  }
  try {
    const res = await fetch(url, {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" },
    });
    return await parseResponse<T>(res);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Request failed" };
  }
}

export async function apiPost<T>(path: string, body?: unknown): Promise<ApiResult<T>> {
  try {
    const res = await fetch(apiUrl(path), {
      method: "POST",
      credentials: "include",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
    });
    return await parseResponse<T>(res);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Request failed" };
  }
}

export async function apiPatch<T>(path: string, body?: unknown): Promise<ApiResult<T>> {
  try {
    const res = await fetch(apiUrl(path), {
      method: "PATCH",
      credentials: "include",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
    });
    return await parseResponse<T>(res);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Request failed" };
  }
}

export function read<T>(result: ApiResult<T> | undefined): T | undefined {
  return result?.ok ? result.data : undefined;
}

export function valueOrDash(value: unknown): string {
  if (value === undefined || value === null || value === "") return "—";
  if (typeof value === "boolean") return value ? "enabled" : "disabled";
  return String(value);
}

export function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}
