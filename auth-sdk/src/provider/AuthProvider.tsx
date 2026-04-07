import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { type FastAuthClientConfig, type SendOtpPurpose } from "../core/api";
import { type AuthUser } from "../core/token";
import { useAuthController } from "../hooks/useAuth";

export type AuthContextValue<TUser extends AuthUser = AuthUser> = {
  apiUrl: string;
  appName: string;
  logo?: string;
  primaryColor?: string;
  user: TUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loadingAction: "idle" | "loginWithOtp" | "verifyOtp" | "logout" | "getCurrentUser";
  error: Error | null;
  loginWithOtp: (input: {
    email?: string;
    phone?: string;
    purpose?: SendOtpPurpose;
    name?: string;
    password?: string;
  }) => Promise<void>;
  verifyOtp: (input: {
    code: string;
    purpose?: SendOtpPurpose;
    email?: string;
    phone?: string;
  }) => Promise<TUser>;
  logout: () => Promise<void>;
  getCurrentUser: () => Promise<TUser | null>;
  clearError: () => void;
};

type AuthProviderProps = {
  children: ReactNode;
  apiUrl: string;
  appName: string;
  logo?: string;
  primaryColor?: string;
  // Optional advanced override for SDK internal fetch behavior.
  config?: Omit<FastAuthClientConfig, "baseUrl">;
  autoRefreshOnLoad?: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  children,
  apiUrl,
  appName,
  logo,
  primaryColor,
  config,
  autoRefreshOnLoad = true,
}: AuthProviderProps) {
  const mergedConfig = useMemo<FastAuthClientConfig>(
    () => ({
      baseUrl: apiUrl,
      withCredentials: config?.withCredentials,
      getAccessToken: config?.getAccessToken,
    }),
    [apiUrl, config?.getAccessToken, config?.withCredentials]
  );

  const auth = useAuthController(mergedConfig);
  const didBootstrapRef = useRef(false);

  useEffect(() => {
    if (!autoRefreshOnLoad || didBootstrapRef.current) return;
    didBootstrapRef.current = true;
    void auth.getCurrentUser();
  }, [autoRefreshOnLoad, auth.getCurrentUser]);

  const value = useMemo<AuthContextValue>(
    () => ({
      apiUrl,
      appName,
      logo,
      primaryColor,
      user: auth.user,
      isAuthenticated: auth.isAuthenticated,
      isLoading: auth.isLoading,
      loadingAction: auth.loadingAction,
      error: auth.error,
      loginWithOtp: auth.loginWithOtp,
      verifyOtp: auth.verifyOtp,
      logout: auth.logout,
      getCurrentUser: auth.getCurrentUser,
      clearError: auth.clearError,
    }),
    [apiUrl, appName, logo, primaryColor, auth]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuthContext must be used inside AuthProvider");
  }
  return ctx;
}

// Backward-compatible alias.
export const useAuth = useAuthContext;
