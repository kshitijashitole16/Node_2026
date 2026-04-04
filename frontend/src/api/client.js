/**
 * Base URL for API calls. Empty string uses Vite dev proxy (same origin).
 * Production: set VITE_API_URL=https://your-api.example.com
 */
export const apiBase = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

export async function apiFetch(path, options = {}) {
  const url = `${apiBase}${path.startsWith("/") ? path : `/${path}`}`;
  const headers = new Headers(options.headers);

  if (
    options.body &&
    typeof options.body === "string" &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: "include",
  });

  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: text || "Unexpected response" };
    }
  }

  if (!res.ok) {
    const err = new Error(
      data?.error || data?.message || res.statusText || "Request failed"
    );
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}
