export type AuthUser = {
    id: string;
    email: string;
    name?: string;
    emailVerified?: boolean;
    [key: string]: unknown;
};
export declare function getAccessToken(): string | null;
export declare function setAccessToken(token: string | null): void;
export declare function getStoredUser<TUser extends AuthUser = AuthUser>(): TUser | null;
export declare function setStoredUser(user: AuthUser | null): void;
export declare function clearStoredAuth(): void;
export type JwtPayload = {
    exp?: number;
    iat?: number;
    sub?: string;
    [key: string]: unknown;
};
export declare function decodeJwt(token: string | null): JwtPayload | null;
export declare function getTokenExpiryMs(token: string | null): number | null;
export declare function isTokenExpired(token: string | null, skewMs?: number): boolean;
//# sourceMappingURL=token.d.ts.map