import { type ApiError, type FastAuthClientConfig, type SendOtpPurpose } from "../core/api";
import { type AuthUser } from "../core/token";
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
export declare function useAuthController<TUser extends AuthUser = AuthUser>(config: FastAuthClientConfig): {
    user: TUser | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    loadingAction: "idle" | "loginWithOtp" | "loginWithPassword" | "verifyOtp" | "logout" | "getCurrentUser";
    error: ApiError | null;
    loginWithPassword: (input: {
        email: string;
        password: string;
    }) => Promise<TUser>;
    loginWithOtp: (input: LoginWithOtpInput) => Promise<void>;
    verifyOtp: (input: VerifyOtpInput) => Promise<TUser>;
    logout: () => Promise<void>;
    getCurrentUser: () => Promise<TUser | null>;
    clearError: () => void;
};
export declare const useAuth: typeof useAuthController;
export {};
//# sourceMappingURL=useAuth.d.ts.map