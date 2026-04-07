import {
  getCurrentUser,
  OtpVerificationError,
  revokeRefreshToken,
  rotateRefreshToken,
  sendLoginOtp,
  verifyLoginOtp,
} from "../services/secureAuthService.js";
import { logAuth } from "../utils/logAuth.js";

const REFRESH_COOKIE = "refreshToken";

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/secure-auth",
  };
}

function ok(res, message, data = {}) {
  return res.status(200).json({ status: "success", message, data });
}

function fail(res, status, code, message) {
  return res.status(status).json({ status: "error", code, message });
}

export async function sendOtpController(req, res) {
  try {
    const identifier = req.body?.identifier;
    if (!identifier) {
      return fail(res, 400, "VALIDATION_ERROR", "identifier is required");
    }
    const result = await sendLoginOtp({ identifier });
    return ok(res, "OTP sent if account exists", result);
  } catch (error) {
    return fail(res, 400, "SEND_OTP_FAILED", error.message || "Could not send OTP");
  }
}

export async function verifyOtpController(req, res) {
  try {
    const { identifier, code } = req.body || {};
    if (!identifier || !code) {
      void logAuth({
        req,
        email: identifier,
        event: "VERIFY_OTP",
        status: "FAIL",
        reason: "VALIDATION_ERROR",
      });
      return fail(res, 400, "VALIDATION_ERROR", "identifier and code are required");
    }
    const result = await verifyLoginOtp({ identifier, code });
    void logAuth({
      req,
      email: identifier,
      userId: result?.user?.id || null,
      event: "VERIFY_OTP",
      status: "SUCCESS",
      reason: null,
      attemptCount: 1,
    });
    res.cookie(REFRESH_COOKIE, result.refreshToken, {
      ...cookieOptions(),
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    return ok(res, "OTP verified", {
      accessToken: result.accessToken,
      user: result.user,
    });
  } catch (error) {
    const reason =
      error instanceof OtpVerificationError
        ? error.reason
        : error?.message || "VERIFY_OTP_FAILED";
    const attemptCount =
      error instanceof OtpVerificationError ? error.attemptCount : 1;
    const statusCode =
      error instanceof OtpVerificationError ? error.statusCode : 401;

    void logAuth({
      req,
      email: req.body?.identifier,
      event: "VERIFY_OTP",
      status: "FAIL",
      reason,
      attemptCount,
    });
    return fail(
      res,
      statusCode,
      reason,
      error?.message || "Could not verify OTP"
    );
  }
}

export async function refreshTokenController(req, res) {
  try {
    const refreshToken = req.cookies?.[REFRESH_COOKIE];
    if (!refreshToken) {
      return fail(res, 401, "MISSING_REFRESH_TOKEN", "Refresh token is missing");
    }

    const result = await rotateRefreshToken(refreshToken);
    res.cookie(REFRESH_COOKIE, result.refreshToken, {
      ...cookieOptions(),
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    return ok(res, "Token refreshed", {
      accessToken: result.accessToken,
    });
  } catch (error) {
    return fail(res, 401, "REFRESH_FAILED", error.message || "Could not refresh token");
  }
}

export async function getCurrentUserController(req, res) {
  try {
    const user = await getCurrentUser(req.auth?.sub);
    if (!user) return fail(res, 404, "USER_NOT_FOUND", "User not found");
    return ok(res, "Current user", { user });
  } catch {
    return fail(res, 500, "CURRENT_USER_FAILED", "Could not fetch current user");
  }
}

export async function logoutController(req, res) {
  try {
    const refreshToken = req.cookies?.[REFRESH_COOKIE];
    await revokeRefreshToken(refreshToken);
    res.clearCookie(REFRESH_COOKIE, cookieOptions());
    return ok(res, "Logged out");
  } catch {
    return fail(res, 500, "LOGOUT_FAILED", "Could not logout");
  }
}
