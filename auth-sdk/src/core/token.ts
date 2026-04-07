const ACCESS_TOKEN_KEY = "fastauth_access_token";
const USER_KEY = "fastauth_user";

function safeStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export type AuthUser = {
  id: string;
  email: string;
  name?: string;
  emailVerified?: boolean;
  [key: string]: unknown;
};

export function getAccessToken(): string | null {
  const storage = safeStorage();
  return storage?.getItem(ACCESS_TOKEN_KEY) ?? null;
}

export function setAccessToken(token: string | null): void {
  const storage = safeStorage();
  if (!storage) return;
  if (token) {
    storage.setItem(ACCESS_TOKEN_KEY, token);
    return;
  }
  storage.removeItem(ACCESS_TOKEN_KEY);
}

export function getStoredUser<TUser extends AuthUser = AuthUser>(): TUser | null {
  const storage = safeStorage();
  const raw = storage?.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as TUser;
  } catch {
    return null;
  }
}

export function setStoredUser(user: AuthUser | null): void {
  const storage = safeStorage();
  if (!storage) return;
  if (user) {
    storage.setItem(USER_KEY, JSON.stringify(user));
    return;
  }
  storage.removeItem(USER_KEY);
}

export function clearStoredAuth(): void {
  setAccessToken(null);
  setStoredUser(null);
}

function base64UrlToBase64(input: string): string {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padLength = (4 - (normalized.length % 4)) % 4;
  return normalized + "=".repeat(padLength);
}

function decodeBase64Utf8(base64: string): string {
  const atobFn =
    typeof globalThis !== "undefined" && typeof globalThis.atob === "function"
      ? globalThis.atob
      : null;
  if (!atobFn) {
    throw new Error("Base64 decoder is unavailable in this runtime.");
  }

  const binary = atobFn(base64);
  try {
    return decodeURIComponent(
      Array.from(binary)
        .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`)
        .join("")
    );
  } catch {
    return binary;
  }
}

export type JwtPayload = {
  exp?: number;
  iat?: number;
  sub?: string;
  [key: string]: unknown;
};

export function decodeJwt(token: string | null): JwtPayload | null {
  const raw = String(token || "").trim();
  if (!raw) return null;

  const parts = raw.split(".");
  if (parts.length < 2) return null;

  try {
    const payloadJson = decodeBase64Utf8(base64UrlToBase64(parts[1]));
    const payload = JSON.parse(payloadJson) as JwtPayload;
    return payload && typeof payload === "object" ? payload : null;
  } catch {
    return null;
  }
}

export function getTokenExpiryMs(token: string | null): number | null {
  const payload = decodeJwt(token);
  const exp = Number(payload?.exp);
  if (!Number.isFinite(exp) || exp <= 0) return null;
  return exp * 1000;
}

export function isTokenExpired(token: string | null, skewMs = 30_000): boolean {
  const expiresAt = getTokenExpiryMs(token);
  if (!expiresAt) return true;
  return Date.now() + Math.max(0, skewMs) >= expiresAt;
}
