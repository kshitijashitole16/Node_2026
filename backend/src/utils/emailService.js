import { getTransporter, isEmailConfigured } from "../config/email.config.js";
import {
  Verification_Email_Template,
  Welcome_Email_Template,
  Password_Reset_Email_Template,
} from "./EmailTemplate.js";

function mailFrom() {
  if (process.env.SMTP_FROM?.trim()) {
    return process.env.SMTP_FROM.trim();
  }
  const user = process.env.SMTP_USER?.trim();
  return user ? `"TanstackQuery" <${user}>` : undefined;
}

export async function sendVerificationEmail(email, verificationCode) {
  if (!isEmailConfigured()) {
    console.warn("Email not configured (SMTP_USER / SMTP_PASS); skipping verification email");
    return {
      ok: false,
      reason: "not_configured",
    };
  }
  const transporter = getTransporter();
  if (!transporter) {
    return {
      ok: false,
      reason: "transporter_unavailable",
    };
  }

  const from = mailFrom();
  if (!from) {
    return {
      ok: false,
      reason: "from_missing",
    };
  }

  try {
    const response = await transporter.sendMail({
      from,
      to: email,
      subject: "Verify Login",
      text: `Your Verify Login OTP is: ${verificationCode}`,
      html: Verification_Email_Template.replace(
        "{verificationCode}",
        String(verificationCode)
      ),
    });
    console.log("Verification email sent", response.messageId);
    return {
      ok: true,
      reason: null,
    };
  } catch (error) {
    console.error("Verification email error", error);
    return {
      ok: false,
      reason: "send_failed",
      errorCode: error?.code ?? null,
      responseCode: error?.responseCode ?? null,
      command: error?.command ?? null,
      errorMessage: error?.message ?? null,
    };
  }
}

export async function sendWelcomeEmail(email, name) {
  if (!isEmailConfigured()) {
    console.warn("Email not configured (SMTP_USER / SMTP_PASS); skipping welcome email");
    return false;
  }
  const transporter = getTransporter();
  if (!transporter) return false;

  const from = mailFrom();
  if (!from) return false;

  try {
    const response = await transporter.sendMail({
      from,
      to: email,
      subject: "Welcome",
      text: `Welcome, ${name}!`,
      html: Welcome_Email_Template.replace("{name}", String(name)),
    });
    console.log("Welcome email sent", response.messageId);
    return true;
  } catch (error) {
    console.error("Welcome email error", error);
    return false;
  }
}

export async function sendPasswordResetOtpEmail(email, otp, validForSeconds) {
  if (!isEmailConfigured()) {
    console.warn("Email not configured (SMTP_USER / SMTP_PASS); skipping password reset email");
    return {
      ok: false,
      reason: "not_configured",
    };
  }
  const transporter = getTransporter();
  if (!transporter) {
    return {
      ok: false,
      reason: "transporter_unavailable",
    };
  }

  const from = mailFrom();
  if (!from) {
    return {
      ok: false,
      reason: "from_missing",
    };
  }

  try {
    const response = await transporter.sendMail({
      from,
      to: email,
      subject: "Reset Password",
      text: `Your Reset Password OTP is ${otp}. It expires in ${validForSeconds} seconds.`,
      html: Password_Reset_Email_Template.replace(
        "{verificationCode}",
        String(otp)
      ).replace("{validForSeconds}", String(validForSeconds)),
    });
    console.log("Password reset email sent", response.messageId);
    return {
      ok: true,
      reason: null,
    };
  } catch (error) {
    console.error("Password reset email error", error);
    return {
      ok: false,
      reason: "send_failed",
      errorCode: error?.code ?? null,
      responseCode: error?.responseCode ?? null,
      command: error?.command ?? null,
      errorMessage: error?.message ?? null,
    };
  }
}
