import { useCallback, useMemo, useState } from "react";
import {
  FastAuthApiClient,
  type ApiError,
  type FastAuthClientConfig,
  type SendOtpPurpose,
} from "../core/api";
import {
  clearStoredAuth,
  getStoredUser,
  setAccessToken,
  setStoredUser,
  type AuthUser,
} from "../core/token";

type LoginWithOtpInput = {
  email?: string;
  phone?: string;
  purpose?: SendOtpPurpose;
  name?: string;
  password?: string;
};

type VerifyOtpInput = {
  code: string;
  purpose?: SendOtpPurpose;
  email?: string;
  phone?: string;
};

type UseAuthState = {
  isLoading: boolean;
  action:
    | "idle"
    | "loginWithOtp"
    | "loginWithPassword"
    | "verifyOtp"
    | "logout"
    | "getCurrentUser";
  error: ApiError | null;
};

function normalizeIdentifier(value: string | undefined): string | undefined {
  const out = String(value ?? "").trim();
  return out.length ? out : undefined;
}

function asApiError(error: unknown): ApiError {
  if (error instanceof Error) {
    return error as ApiError;
  }
  return new Error("Unknown SDK error") as ApiError;
}

export function useAuthController<TUser extends AuthUser = AuthUser>(
  config: FastAuthClientConfig
) {
  const [user, setUser] = useState<TUser | null>(() => getStoredUser<TUser>());
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(getStoredUser<TUser>()));
  const [state, setState] = useState<UseAuthState>({
    isLoading: false,
    action: "idle",
    error: null,
  });
  const [pending, setPending] = useState<{
    purpose: SendOtpPurpose;
    email?: string;
    phone?: string;
  } | null>(null);

  const client = useMemo(() => new FastAuthApiClient(config), [config]);

  const begin = useCallback((action: UseAuthState["action"]) => {
    setState({ isLoading: true, action, error: null });
  }, []);

  const done = useCallback((nextUser?: TUser | null) => {
    if (nextUser !== undefined) {
      setUser(nextUser);
      setIsAuthenticated(Boolean(nextUser));
    }
    setState((prev) => ({ ...prev, isLoading: false, action: "idle" }));
  }, []);

  const fail = useCallback((error: unknown) => {
    setState((prev) => ({ ...prev, isLoading: false, action: "idle", error: asApiError(error) }));
  }, []);

  const loginWithPassword = useCallback(
    async (input: { email: string; password: string }) => {
      begin("loginWithPassword");
      try {
        const email = normalizeIdentifier(input.email)?.toLowerCase();
        if (!email) {
          throw new Error("Email is required.");
        }
        if (!input.password) {
          throw new Error("Password is required.");
        }
        const response = await client.loginWithPassword<TUser>({
          email,
          password: input.password,
        });
        const nextUser = response.data.user;
        setAccessToken(response.data.accessToken);
        setStoredUser(nextUser);
        done(nextUser);
        return nextUser;
      } catch (error) {
        fail(error);
        throw error;
      }
    },
    [begin, client, done, fail]
  );

  const loginWithOtp = useCallback(
    async (input: LoginWithOtpInput) => {
      begin("loginWithOtp");
      try {
        const email = normalizeIdentifier(input.email)?.toLowerCase();
        const phone = normalizeIdentifier(input.phone);
        if (!email && !phone) {
          throw new Error("Provide either email or phone for OTP login.");
        }

        const purpose = input.purpose ?? "Authify_Register_user";
        await client.sendOtp({
          purpose,
          email,
          phone,
          name: input.name,
          password: input.password,
        });

        setPending({ purpose, email, phone });
        done();
      } catch (error) {
        fail(error);
        throw error;
      }
    },
    [begin, client, done, fail]
  );

  const verifyOtp = useCallback(
    async (input: VerifyOtpInput) => {
      begin("verifyOtp");
      try {
        const code = normalizeIdentifier(input.code);
        if (!code) {
          throw new Error("OTP code is required.");
        }

        const email = normalizeIdentifier(input.email)?.toLowerCase() ?? pending?.email;
        const phone = normalizeIdentifier(input.phone) ?? pending?.phone;
        const purpose = input.purpose ?? pending?.purpose ?? "Authify_Register_user";

        if (!email && !phone) {
          throw new Error("Missing identifier. Call loginWithOtp first or pass email/phone.");
        }

        const response = await client.verifyOtp<TUser>({
          purpose,
          email,
          phone,
          otp: code,
        });

        const nextUser = response.data.user;
        setAccessToken(response.data.accessToken);
        setStoredUser(nextUser);
        done(nextUser);
        return nextUser;
      } catch (error) {
        fail(error);
        throw error;
      }
    },
    [begin, client, done, fail, pending?.email, pending?.phone, pending?.purpose]
  );

  const logout = useCallback(async () => {
    begin("logout");
    try {
      await client.logout();
      clearStoredAuth();
      setPending(null);
      done(null);
    } catch (error) {
      clearStoredAuth();
      setPending(null);
      setUser(null);
      setIsAuthenticated(false);
      fail(error);
      throw error;
    }
  }, [begin, client, done, fail]);

  const getCurrentUser = useCallback(async () => {
    begin("getCurrentUser");
    try {
      const response = await client.getCurrentUser<TUser>();
      const nextUser = response.data.user;
      setStoredUser(nextUser);
      done(nextUser);
      return nextUser;
    } catch (error) {
      fail(error);
      return null;
    }
  }, [begin, client, done, fail]);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated,
      isLoading: state.isLoading,
      loadingAction: state.action,
      error: state.error,
      loginWithPassword,
      loginWithOtp,
      verifyOtp,
      logout,
      getCurrentUser,
      clearError: () => setState((prev) => ({ ...prev, error: null })),
    }),
    [
      getCurrentUser,
      loginWithPassword,
      loginWithOtp,
      logout,
      state.action,
      state.error,
      state.isLoading,
      user,
      verifyOtp,
    ]
  );

  return value;
}

export const useAuth = useAuthController;
