import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { apiFetch } from "../../api/client.js";
import {
  getAccessToken,
  loginRequest,
  logoutRequest,
  refreshRequest,
  setAccessToken,
  verifyEmailRequest,
} from "../../api/authApi.js";

const STORAGE_USER = "auth_user";

const AuthContext = createContext(null);

function loadStoredUser() {
  try {
    const raw = localStorage.getItem(STORAGE_USER);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function persistUser(user) {
  if (user) {
    localStorage.setItem(STORAGE_USER, JSON.stringify(user));
  } else {
    localStorage.removeItem(STORAGE_USER);
  }
}

function parseJwtExp(token) {
  try {
    const parts = String(token || "").split(".");
    if (parts.length < 2) return null;
    const payload = JSON.parse(atob(parts[1]));
    const exp = Number(payload?.exp);
    return Number.isFinite(exp) ? exp : null;
  } catch {
    return null;
  }
}

function isTokenExpired(token, skewMs = 30_000) {
  const expSeconds = parseJwtExp(token);
  if (!expSeconds) return false;
  const expiresAtMs = expSeconds * 1000;
  return Date.now() + skewMs >= expiresAtMs;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(loadStoredUser);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const applySession = useCallback((nextUser, accessToken) => {
    setUser(nextUser || null);
    persistUser(nextUser || null);
    setAccessToken(accessToken || null);
  }, []);

  const clearSession = useCallback(() => {
    setUser(null);
    persistUser(null);
    setAccessToken(null);
  }, []);

  const getUser = useCallback(() => user, [user]);

  const refreshToken = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const response = await refreshRequest();
      const nextAccessToken = response?.data?.accessToken;
      if (!nextAccessToken) {
        clearSession();
        return null;
      }
      setAccessToken(nextAccessToken);
      return nextAccessToken;
    } catch {
      clearSession();
      return null;
    } finally {
      setIsRefreshing(false);
    }
  }, [clearSession]);

  const ensureValidAccessToken = useCallback(async () => {
    const token = getAccessToken();
    if (!token) return refreshToken();
    if (isTokenExpired(token)) return refreshToken();
    return token;
  }, [refreshToken]);

  /**
   * Login with password or verify using OTP.
   * - Password flow: loginWithOtp({ email, password })
   * - OTP flow: loginWithOtp({ email, otp })
   */
  const loginWithOtp = useCallback(
    async ({ email, password, otp }) => {
      const emailNorm = String(email ?? "").trim().toLowerCase();
      if (!emailNorm) {
        throw new Error("Email is required");
      }

      try {
        if (otp != null && String(otp).trim()) {
          const response = await verifyEmailRequest({
            email: emailNorm,
            otp: String(otp).trim(),
          });
          const nextUser = response?.data?.user;
          const accessToken = response?.data?.accessToken;
          if (!nextUser || !accessToken) {
            throw new Error("Unexpected verify-email response");
          }
          applySession(nextUser, accessToken);
          return {
            ok: true,
            needsOtp: false,
            user: nextUser,
            accessToken,
            flow: "otp",
          };
        }

        const response = await loginRequest({
          email: emailNorm,
          password: String(password ?? ""),
        });
        const nextUser = response?.data?.user;
        const accessToken = response?.data?.accessToken;
        if (!nextUser || !accessToken) {
          throw new Error("Unexpected login response");
        }
        applySession(nextUser, accessToken);
        return {
          ok: true,
          needsOtp: false,
          user: nextUser,
          accessToken,
          flow: "password",
        };
      } catch (error) {
        if (error?.status === 403 && error?.data?.needsEmailVerification) {
          return {
            ok: false,
            needsOtp: true,
            email: String(error.data.email || emailNorm),
            message:
              error.data?.error ||
              "Email verification required. Please enter OTP.",
          };
        }
        throw error;
      }
    },
    [applySession]
  );

  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } finally {
      clearSession();
    }
  }, [clearSession]);

  /**
   * Authenticated fetch helper with automatic refresh-on-expiry/401.
   */
  const authFetch = useCallback(
    async (path, options = {}) => {
      const headers = new Headers(options.headers || {});
      let token = await ensureValidAccessToken();
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }

      try {
        return await apiFetch(path, { ...options, headers });
      } catch (error) {
        if (error?.status !== 401) throw error;

        token = await refreshToken();
        if (!token) throw error;

        const retryHeaders = new Headers(options.headers || {});
        retryHeaders.set("Authorization", `Bearer ${token}`);
        return apiFetch(path, { ...options, headers: retryHeaders });
      }
    },
    [ensureValidAccessToken, refreshToken]
  );

  // Backward compatibility with existing app API.
  const signInSession = useCallback(
    (nextUser) => {
      applySession(nextUser, getAccessToken());
    },
    [applySession]
  );

  const logoutLocal = useCallback(() => {
    clearSession();
  }, [clearSession]);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isRefreshing,
      loginWithOtp,
      logout,
      getUser,
      authFetch,
      refreshToken,
      ensureValidAccessToken,
      // Back-compat exports:
      signInSession,
      logoutLocal,
    }),
    [
      authFetch,
      ensureValidAccessToken,
      getUser,
      isRefreshing,
      loginWithOtp,
      logout,
      logoutLocal,
      refreshToken,
      signInSession,
      user,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
