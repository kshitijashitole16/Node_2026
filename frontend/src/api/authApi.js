import { apiFetch } from "./client.js";

const ACCESS_KEY = "access_token";

export function getAccessToken() {
  return localStorage.getItem(ACCESS_KEY);
}

export function setAccessToken(token) {
  if (token) {
    localStorage.setItem(ACCESS_KEY, token);
  } else {
    localStorage.removeItem(ACCESS_KEY);
  }
}

export function loginRequest(body) {
  return apiFetch("/auth/login", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function registerRequest(body) {
  return apiFetch("/auth/register", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function refreshRequest() {
  return apiFetch("/auth/refresh", { method: "POST" });
}

export function logoutRequest() {
  return apiFetch("/auth/logout", { method: "POST" });
}
