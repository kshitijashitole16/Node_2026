export { FastAuthApiClient, createApiClient, type FastAuthClientConfig, type ApiRequestOptions, } from "./core/api";
export { getAccessToken, setAccessToken, clearStoredAuth, getStoredUser, setStoredUser, decodeJwt, getTokenExpiryMs, isTokenExpired, type AuthUser, type JwtPayload, } from "./core/token";
export { AuthProvider, useAuth, useAuthContext } from "./provider/AuthProvider";
export { useAuthController } from "./hooks/useAuth";
export { LoginModal, type LoginModalProps } from "./components/LoginModal";
//# sourceMappingURL=index.d.ts.map