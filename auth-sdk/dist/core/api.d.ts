import { type AuthUser } from "./token";
export type ApiError = Error & {
    status?: number;
    data?: unknown;
};
export type FastAuthClientConfig = {
    baseUrl: string;
    withCredentials?: boolean;
    getAccessToken?: () => string | null;
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
export declare class FastAuthApiClient {
    private readonly baseUrl;
    private readonly withCredentials;
    private readonly readToken;
    constructor(config: FastAuthClientConfig);
    sendOtp(input: SendOtpInput): Promise<FastAuthResponse<Record<string, unknown>>>;
    verifyOtp<TUser extends AuthUser = AuthUser>(input: VerifyOtpInput): Promise<FastAuthResponse<VerifyOtpData<TUser>>>;
    refreshToken(): Promise<FastAuthResponse<RefreshTokenData>>;
    getCurrentUser<TUser extends AuthUser = AuthUser>(): Promise<FastAuthResponse<CurrentUserData<TUser>>>;
    logout(): Promise<FastAuthResponse<Record<string, unknown>>>;
    private request;
    private parseJson;
}
/**
 * Minimal reusable fetch client factory for SDK use-cases.
 * Uses native fetch only and injects bearer token when auth=true.
 */
export declare function createApiClient(config: FastAuthClientConfig): <T = unknown>(path: string, options?: ApiRequestOptions) => Promise<T>;
//# sourceMappingURL=api.d.ts.map