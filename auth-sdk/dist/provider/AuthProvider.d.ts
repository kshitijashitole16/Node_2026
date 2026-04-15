import { type ReactNode } from "react";
import { type FastAuthClientConfig, type SendOtpPurpose } from "../core/api";
import { type AuthUser } from "../core/token";
export type AuthContextValue<TUser extends AuthUser = AuthUser> = {
    apiUrl: string;
    appName: string;
    logo?: string;
    primaryColor?: string;
    user: TUser | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    loadingAction: "idle" | "loginWithOtp" | "loginWithPassword" | "verifyOtp" | "logout" | "getCurrentUser";
    error: Error | null;
    loginWithPassword: (input: {
        email: string;
        password: string;
    }) => Promise<TUser>;
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
    /** Forwarded to API client for protected analytics list routes (optional). */
    analyticsAdminToken?: string;
};
type AuthProviderProps = {
    children: ReactNode;
    apiUrl: string;
    appName: string;
    logo?: string;
    primaryColor?: string;
    config?: Omit<FastAuthClientConfig, "baseUrl">;
    autoRefreshOnLoad?: boolean;
};
export declare function AuthProvider({ children, apiUrl, appName, logo, primaryColor, config, autoRefreshOnLoad, }: AuthProviderProps): import("react/jsx-runtime").JSX.Element;
export declare function useAuthContext(): AuthContextValue<AuthUser>;
export declare const useAuth: typeof useAuthContext;
export {};
//# sourceMappingURL=AuthProvider.d.ts.map