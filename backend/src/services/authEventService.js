import crypto from "crypto";
import { prisma } from "../config/db.js";

const CHECK_TTL_OK_MS = 60_000;
const CHECK_TTL_MISS_MS = 5_000;

let tableExistsCache = null;
let cacheCheckedAt = 0;
let warnedMissingTable = false;

const AUTH_EVENT_TYPE = Object.freeze({
  LOGIN: "LOGIN",
  OTP_EMAIL_VERIFICATION: "OTP_EMAIL_VERIFICATION",
  OTP_PASSWORD_RESET: "OTP_PASSWORD_RESET",
});

const AUTH_EVENT_STATUS = Object.freeze({
  SUCCESS: "SUCCESS",
  FAILURE: "FAILURE",
});

function asBoolean(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "t" || normalized === "1";
  }
  if (typeof value === "number") return value > 0;
  return false;
}

function isMissingTableError(error) {
  const code = String(error?.code ?? "").toUpperCase();
  const message = String(error?.message ?? "");
  return (
    code === "42P01" ||
    (code === "P2010" && /relation .*AuthEvent.* does not exist/i.test(message)) ||
    /relation .*AuthEvent.* does not exist/i.test(message)
  );
}

function normalizeIpAddress(rawIp) {
  const ip = String(rawIp ?? "").trim();
  if (!ip) return null;
  if (ip.startsWith("::ffff:")) return ip.slice(7);
  return ip;
}

function clientIpFromRequest(req) {
  const headerValue = req?.headers?.["x-forwarded-for"];
  if (typeof headerValue === "string" && headerValue.trim()) {
    const first = headerValue.split(",")[0]?.trim();
    const normalized = normalizeIpAddress(first);
    if (normalized) return normalized;
  }

  if (Array.isArray(headerValue) && headerValue.length > 0) {
    const first = String(headerValue[0] ?? "").split(",")[0]?.trim();
    const normalized = normalizeIpAddress(first);
    if (normalized) return normalized;
  }

  return (
    normalizeIpAddress(req?.ip) ||
    normalizeIpAddress(req?.socket?.remoteAddress) ||
    null
  );
}

async function checkAuthEventTableExists() {
  const now = Date.now();
  const ttl = tableExistsCache ? CHECK_TTL_OK_MS : CHECK_TTL_MISS_MS;
  if (tableExistsCache !== null && now - cacheCheckedAt < ttl) {
    return tableExistsCache;
  }

  try {
    const rows = await prisma.$queryRawUnsafe(
      `
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = current_schema()
          AND table_name = 'AuthEvent'
      ) AS "exists"
    `
    );

    const exists = asBoolean(rows?.[0]?.exists);
    tableExistsCache = exists;
    cacheCheckedAt = now;

    if (!exists && !warnedMissingTable) {
      warnedMissingTable = true;
      console.warn(
        "[analytics] AuthEvent table not found. Run: cd backend && npx prisma migrate deploy"
      );
    }

    return exists;
  } catch (error) {
    tableExistsCache = false;
    cacheCheckedAt = now;
    if (!warnedMissingTable) {
      warnedMissingTable = true;
      console.warn(
        "[analytics] Could not check AuthEvent table:",
        error?.message || error
      );
    }
    return false;
  }
}

export async function isAuthEventTableAvailable() {
  return checkAuthEventTableExists();
}

export async function recordAuthEvent({
  req,
  eventType,
  status,
  userId = null,
  metadata,
}) {
  if (!eventType || !status) return;

  const tableAvailable = await checkAuthEventTableExists();
  if (!tableAvailable) return;

  try {
    await prisma.$executeRawUnsafe(
      `
      INSERT INTO "AuthEvent"
      ("id", "userId", "eventType", "status", "ipAddress", "metadata", "createdAt")
      VALUES ($1, $2, $3, $4, $5, $6::jsonb, NOW())
    `,
      crypto.randomUUID(),
      userId,
      eventType,
      status,
      clientIpFromRequest(req),
      metadata ? JSON.stringify(metadata) : null
    );
  } catch (error) {
    if (isMissingTableError(error)) {
      tableExistsCache = false;
      cacheCheckedAt = Date.now();
      if (!warnedMissingTable) {
        warnedMissingTable = true;
        console.warn(
          "[analytics] AuthEvent table missing during insert. Run: cd backend && npx prisma migrate deploy"
        );
      }
      return;
    }

    console.warn("[analytics] Failed to record auth event:", error?.message || error);
  }
}

export { AUTH_EVENT_TYPE, AUTH_EVENT_STATUS, clientIpFromRequest };
