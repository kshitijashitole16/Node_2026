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

export function verifyEmailRequest(body) {
  return apiFetch("/auth/verify-email", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function resendVerificationRequest(body) {
  return apiFetch("/auth/resend-verification", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function forgotPasswordRequestOtp(body) {
  return apiFetch("/auth/forgot-password/request-otp", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function forgotPasswordVerifyOtp(body) {
  return apiFetch("/auth/forgot-password/verify-otp", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function forgotPasswordReset(body) {
  return apiFetch("/auth/forgot-password/reset", {
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
