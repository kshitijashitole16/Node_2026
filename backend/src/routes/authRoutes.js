import express from "express";
import {
  register,
  login,
  refresh,
  logout,
  deleteAccount,
  verifyEmail,
  resendVerification,
  requestPasswordResetOtp,
  verifyPasswordResetOtp,
  resetPassword,
} from "../controller/authController.js";
import {
  loginSchema,
  registerSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  forgotPasswordRequestSchema,
  forgotPasswordVerifyOtpSchema,
  forgotPasswordResetSchema,
} from "../validators/authValidators.js";
import { validateRequest } from "../middleware/validateRequest.js";

const router = express.Router();

router.post("/register", validateRequest(registerSchema), register);
router.post("/login", validateRequest(loginSchema), login);
router.post("/verify-email", validateRequest(verifyEmailSchema), verifyEmail);
router.post(
  "/resend-verification",
  validateRequest(resendVerificationSchema),
  resendVerification
);
router.post(
  "/forgot-password/request-otp",
  validateRequest(forgotPasswordRequestSchema),
  requestPasswordResetOtp
);
router.post(
  "/forgot-password/verify-otp",
  validateRequest(forgotPasswordVerifyOtpSchema),
  verifyPasswordResetOtp
);
router.post(
  "/forgot-password/reset",
  validateRequest(forgotPasswordResetSchema),
  resetPassword
);
router.post("/refresh", refresh);
router.post("/logout", logout);
router.delete("/account", validateRequest(loginSchema), deleteAccount);

export default router;
