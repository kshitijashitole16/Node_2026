import { type AuthUser } from "./token";
export type ApiError = Error & {
    status?: number;
    data?: unknown;
};
export type FastAuthClientConfig = {
    baseUrl: string;
    withCredentials?: boolean;
    getAccessToken?: () => string | null;
    /** Matches server `FAST_AUTH_ADMIN_SECRET` for GET /analytics/auth/events and /users. */
    analyticsAdminToken?: string;
};
export type ApiRequestOptions = {
    method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    body?: unknown;
    headers?: HeadersInit;
    auth?: boolean;
};
export type SendOtpPurpose = "RegisterAuthOtp" | "ForgotAuthOtp" | "Authify_Register_user" | "Authify_Forgot_password";
export type SendOtpInput = {
    email?: string;
    phone?: string;
    purpose: SendOtpPurpose;
    name?: string;
    password?: string;
};
export type VerifyOtpInput = {
    email?: string;
    phone?: string;
    otp: string;
    purpose: SendOtpPurpose;
};
export type FastAuthResponse<TData> = {
    status: string;
    message?: string;
    data: TData;
};
export type VerifyOtpData<TUser extends AuthUser = AuthUser> = {
    accessToken: string;
    user: TUser;
};
export type RefreshTokenData = {
    accessToken: string;
};
export type CurrentUserData<TUser extends AuthUser = AuthUser> = {
    user: TUser;
};
export type AuthEventRow = {
    id: string;
    userId: string | null;
    eventType: string;
    status: string;
    ipAddress: string | null;
    metadata: unknown;
    createdAt: string;
    user: {
        id: string;
        email: string;
        name: string;
    } | null;
};
export type DashboardUserRow = {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
    createdAt: string;
};
export declare class FastAuthApiClient {
    private readonly baseUrl;
    private readonly withCredentials;
    private readonly readToken;
    private readonly analyticsAdminToken?;
    constructor(config: FastAuthClientConfig);
    sendOtp(input: SendOtpInput): Promise<FastAuthResponse<Record<string, unknown>>>;
    verifyOtp<TUser extends AuthUser = AuthUser>(input: VerifyOtpInput): Promise<FastAuthResponse<VerifyOtpData<TUser>>>;
    refreshToken(): Promise<FastAuthResponse<RefreshTokenData>>;
    getCurrentUser<TUser extends AuthUser = AuthUser>(): Promise<FastAuthResponse<CurrentUserData<TUser>>>;
    logout(): Promise<FastAuthResponse<Record<string, unknown>>>;
    /** Email + password sign-in; sets httpOnly cookies server-side and returns access token + user. */
    loginWithPassword<TUser extends AuthUser = AuthUser>(input: {
        email: string;
        password: string;
    }): Promise<FastAuthResponse<VerifyOtpData<TUser>>>;
    resetPassword(input: {
        email: string;
        otp: string;
        newPassword: string;
        confirmPassword: string;
    }): Promise<FastAuthResponse<Record<string, unknown>>>;
    /** Aggregated charts and totals (same payload as backend GET /analytics/auth). */
    getAuthAnalytics(query?: Record<string, string | number | boolean | undefined>): Promise<FastAuthResponse<Record<string, unknown>>>;
    getAuthEventsPage(input?: {
        limit?: number;
        offset?: number;
    }): Promise<FastAuthResponse<{
        items: AuthEventRow[];
        total: number;
        meta: {
            tableReady: boolean;
            limit: number;
            offset: number;
        };
    }>>;
    getUsersPage(input?: {
        page?: number;
        limit?: number;
    }): Promise<FastAuthResponse<{
        items: DashboardUserRow[];
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    }>>;
    private request;
    private parseJson;
}
/**
 * Minimal reusable fetch client factory for SDK use-cases.
 * Uses native fetch only and injects bearer token when auth=true.
 */
export declare function createApiClient(config: FastAuthClientConfig): <T = unknown>(path: string, options?: ApiRequestOptions) => Promise<T>;
//# sourceMappingURL=api.d.ts.map