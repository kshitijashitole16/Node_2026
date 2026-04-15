export {
  FastAuthApiClient,
  createApiClient,
  type FastAuthClientConfig,
  type ApiRequestOptions,
  type AuthEventRow,
  type DashboardUserRow,
} from "./core/api";
export {
  getAccessToken,
  setAccessToken,
  clearStoredAuth,
  getStoredUser,
  setStoredUser,
  decodeJwt,
  getTokenExpiryMs,
  isTokenExpired,
  type AuthUser,
  type JwtPayload,
} from "./core/token";
export { AuthProvider, useAuth, useAuthContext } from "./provider/AuthProvider";
export { useAuthController } from "./hooks/useAuth";
export { LoginModal, type LoginModalProps } from "./components/LoginModal";
export { PasswordLoginModal, type PasswordLoginModalProps } from "./components/PasswordLoginModal";
export { RegisterModal, type RegisterModalProps } from "./components/RegisterModal";
export { ForgotPasswordModal, type ForgotPasswordModalProps } from "./components/ForgotPasswordModal";
export { AuthDashboard, type AuthDashboardProps } from "./components/AuthDashboard";
export { OtpCodePanel, type OtpCodePanelProps } from "./components/OtpCodePanel";
