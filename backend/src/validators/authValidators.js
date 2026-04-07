import { z } from "zod";

/**
 * Validation schema for user registration
 * Validates name, email format, and password strength
 */
const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters"),
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Please provide a valid email")
    .toLowerCase(),
  password: z
    .string()
    .min(1, "Password is required")
    .min(6, "Password must be at least 6 characters"),
});

/**
 * Validation schema for user login
 * Validates email format and ensures password is provided
 */
const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Please provide a valid email")
    .toLowerCase(),
  password: z.string().min(1, "Password is required"),
});

const verifyEmailSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Please provide a valid email")
    .toLowerCase(),
  otp: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter the 6-digit code from your email"),
});

const resendVerificationSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Please provide a valid email")
    .toLowerCase(),
});

const forgotPasswordRequestSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Please provide a valid email")
    .toLowerCase(),
});

const forgotPasswordVerifyOtpSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Please provide a valid email")
    .toLowerCase(),
  otp: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter the 6-digit code from your email"),
});

const forgotPasswordResetSchema = z
  .object({
    email: z
      .string()
      .trim()
      .min(1, "Email is required")
      .email("Please provide a valid email")
      .toLowerCase(),
    otp: z
      .string()
      .trim()
      .regex(/^\d{6}$/, "Enter the 6-digit code from your email"),
    newPassword: z
      .string()
      .min(1, "New password is required")
      .min(6, "Password must be at least 6 characters"),
    confirmPassword: z
      .string()
      .min(1, "Confirm password is required")
      .min(6, "Password must be at least 6 characters"),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

const otpPurposeSchema = z.enum([
  "RegisterAuthOtp",
  "ForgotAuthOtp",
  "Authify_Register_user",
  "Authify_Forgot_password",
]);

const sendOtpSchema = z
  .object({
    purpose: otpPurposeSchema,
    email: z
      .string()
      .trim()
      .min(1, "Email is required")
      .email("Please provide a valid email")
      .toLowerCase(),
    name: z.string().trim().min(2, "Name must be at least 2 characters").optional(),
    password: z
      .string()
      .min(6, "Password must be at least 6 characters")
      .optional(),
  })
  .superRefine((value, ctx) => {
    if (value.purpose === "RegisterAuthOtp" || value.purpose === "Authify_Register_user") {
      if (!value.name) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Name is required for RegisterAuthOtp/Authify_Register_user",
          path: ["name"],
        });
      }
      if (!value.password) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Password is required for RegisterAuthOtp/Authify_Register_user",
          path: ["password"],
        });
      }
    }
  });

const verifyOtpSchema = z.object({
  purpose: otpPurposeSchema,
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Please provide a valid email")
    .toLowerCase(),
  otp: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter the 6-digit code from your email"),
});

export {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  forgotPasswordRequestSchema,
  forgotPasswordVerifyOtpSchema,
  forgotPasswordResetSchema,
  sendOtpSchema,
  verifyOtpSchema,
};
