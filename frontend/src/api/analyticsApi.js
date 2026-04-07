import { getAccessToken } from "./authApi.js";
import { apiFetch } from "./client.js";

function authHeaders() {
  const token = getAccessToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

function toQuery(params) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params || {})) {
    if (value === undefined || value === null || value === "") continue;
    query.set(key, String(value));
  }
  const out = query.toString();
  return out ? `?${out}` : "";
}

export function fetchAuthAnalytics(params = {}) {
  const query = toQuery(params);
  return apiFetch(`/analytics/auth${query}`, {
    method: "GET",
    headers: authHeaders(),
  });
}

export function askAuthAnalyticsAssistant(body = {}) {
  return apiFetch("/analytics/auth/ask", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
}
