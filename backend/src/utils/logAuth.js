import crypto from "crypto";
import { prisma } from "../config/db.js";

const EVENT_MAP = Object.freeze({
  LOGIN: "LOGIN",
  SEND_OTP: "OTP_EMAIL_VERIFICATION",
  VERIFY_OTP: "OTP_EMAIL_VERIFICATION",
  OTP_EMAIL_VERIFICATION: "OTP_EMAIL_VERIFICATION",
  OTP_PASSWORD_RESET: "OTP_PASSWORD_RESET",
});

const STATUS_MAP = Object.freeze({
  SUCCESS: "SUCCESS",
  FAIL: "FAILURE",
  FAILURE: "FAILURE",
});

function normalizeEvent(event) {
  const key = String(event || "").trim().toUpperCase();
  return EVENT_MAP[key] || "OTP_EMAIL_VERIFICATION";
}

function normalizeStatus(status) {
  const key = String(status || "").trim().toUpperCase();
  return STATUS_MAP[key] || "FAILURE";
}

function normalizeAttemptCount(value) {
  const count = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(count) || count <= 0) return 1;
  return count;
}

function clientIpFromRequest(req) {
  const xff = req?.headers?.["x-forwarded-for"];
  const first =
    typeof xff === "string"
      ? xff.split(",")[0]?.trim()
      : Array.isArray(xff)
        ? String(xff[0] || "").split(",")[0]?.trim()
        : "";
  return first || req?.ip || req?.socket?.remoteAddress || null;
}

/**
 * Non-blocking auth logger.
 * - Never throws (swallows internal failures)
 * - Compatible with current AuthEvent schema via metadata JSON
 */
export async function logAuth({
  req,
  email,
  ip,
  event,
  status,
  reason = null,
  attemptCount = 1,
  userAgent,
  userId = null,
  metadata = {},
} = {}) {
  try {
    const eventType = normalizeEvent(event);
    const normalizedStatus = normalizeStatus(status);
    const ipAddress = ip || clientIpFromRequest(req);
    const ua = userAgent || req?.headers?.["user-agent"] || null;

    const payload = {
      email: email ? String(email).trim().toLowerCase() : null,
      reason: reason ? String(reason).trim() : null,
      attemptCount: normalizeAttemptCount(attemptCount),
      userAgent: ua ? String(ua) : null,
      ...metadata,
    };

    await prisma.$executeRawUnsafe(
      `
      INSERT INTO "AuthEvent"
      ("id", "userId", "eventType", "status", "ipAddress", "metadata", "createdAt")
      VALUES ($1, $2, $3, $4, $5, $6::jsonb, NOW())
    `,
      crypto.randomUUID(),
      userId,
      eventType,
      normalizedStatus,
      ipAddress,
      JSON.stringify(payload)
    );
    return true;
  } catch (error) {
    console.warn("[auth-log] logging skipped:", error?.message || error);
    return false;
  }
}
