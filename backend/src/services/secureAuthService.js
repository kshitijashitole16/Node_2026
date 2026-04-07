import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { prisma } from "../config/db.js";

const OTP_TTL_SECONDS = Number(process.env.AUTH_OTP_TTL_SECONDS || 300);
const OTP_MAX_ATTEMPTS = Number(process.env.AUTH_OTP_MAX_ATTEMPTS || 5);
const ACCESS_TOKEN_EXPIRES_IN = process.env.ACCESS_TOKEN_EXPIRES_IN?.trim() || "15m";
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN?.trim() || "7d";
const REFRESH_TTL_MS = parseDurationMs(REFRESH_TOKEN_EXPIRES_IN) ?? 7 * 24 * 60 * 60 * 1000;
const OTP_PEPPER = process.env.OTP_PEPPER?.trim() || "fastauth-default-otp-pepper";
const REFRESH_PEPPER =
  process.env.REFRESH_TOKEN_PEPPER?.trim() || "fastauth-default-refresh-pepper";

function getAccessSecret() {
  const secret = process.env.JWT_ACCESS_SECRET?.trim() || process.env.JWT_SECRET?.trim();
  if (!secret) throw new Error("Missing JWT_ACCESS_SECRET (or JWT_SECRET)");
  return secret;
}

function getRefreshSecret() {
  const secret = process.env.JWT_REFRESH_SECRET?.trim() || process.env.JWT_SECRET?.trim();
  if (!secret) throw new Error("Missing JWT_REFRESH_SECRET (or JWT_SECRET)");
  return secret;
}

function parseDurationMs(exp) {
  const raw = String(exp || "").trim();
  const match = raw.match(/^(\d+)([smhd])$/i);
  if (!match) return null;
  const value = Number(match[1]);
  const unit = match[2].toLowerCase();
  const unitMap = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return value * (unitMap[unit] || 0);
}

function nowPlusMs(ms) {
  return new Date(Date.now() + ms);
}

function normalizeIdentifier(identifier) {
  return String(identifier || "").trim().toLowerCase();
}

function otpHash(plainOtp) {
  return crypto.createHash("sha256").update(`${OTP_PEPPER}:${plainOtp}`).digest("hex");
}

function tokenHash(token) {
  return crypto.createHash("sha256").update(`${REFRESH_PEPPER}:${token}`).digest("hex");
}

function randomOtp() {
  return String(crypto.randomInt(100000, 1000000));
}

function safeEqualHex(left, right) {
  const a = Buffer.from(String(left || ""), "hex");
  const b = Buffer.from(String(right || ""), "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export const OTP_FAILURE_REASON = Object.freeze({
  INVALID_OTP: "INVALID_OTP",
  EXPIRED_OTP: "EXPIRED_OTP",
  MAX_ATTEMPTS_EXCEEDED: "MAX_ATTEMPTS_EXCEEDED",
});

export class OtpVerificationError extends Error {
  constructor(reason, message, attemptCount = 1, statusCode = 401) {
    super(message);
    this.name = "OtpVerificationError";
    this.reason = reason;
    this.attemptCount = attemptCount;
    this.statusCode = statusCode;
  }
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    emailVerified: user.emailVerified,
  };
}

function signAccessToken(user) {
  return jwt.sign({ sub: user.id, email: user.email }, getAccessSecret(), {
    expiresIn: ACCESS_TOKEN_EXPIRES_IN,
  });
}

function signRefreshToken(userId, jti) {
  return jwt.sign({ sub: userId, jti }, getRefreshSecret(), {
    expiresIn: REFRESH_TOKEN_EXPIRES_IN,
  });
}

function verifyRefreshToken(token) {
  return jwt.verify(token, getRefreshSecret());
}

export function verifyAccessToken(token) {
  return jwt.verify(token, getAccessSecret());
}

async function ensureTables() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "AuthOtpChallenge" (
      "id" TEXT PRIMARY KEY,
      "identifier" TEXT NOT NULL,
      "otpHash" TEXT NOT NULL,
      "purpose" TEXT NOT NULL,
      "attempts" INTEGER NOT NULL DEFAULT 0,
      "usedAt" TIMESTAMP(3),
      "expiresAt" TIMESTAMP(3) NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "AuthOtpChallenge_identifier_idx"
    ON "AuthOtpChallenge" ("identifier", "purpose", "createdAt")
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "AuthRefreshSession" (
      "id" TEXT PRIMARY KEY,
      "jti" TEXT NOT NULL UNIQUE,
      "userId" TEXT NOT NULL,
      "tokenHash" TEXT NOT NULL,
      "expiresAt" TIMESTAMP(3) NOT NULL,
      "revokedAt" TIMESTAMP(3),
      "replacedByJti" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "AuthRefreshSession_user_idx"
    ON "AuthRefreshSession" ("userId", "createdAt")
  `);
}

export async function sendLoginOtp({ identifier }) {
  await ensureTables();
  const normalized = normalizeIdentifier(identifier);
  if (!normalized) throw new Error("identifier is required");

  const user = await prisma.user.findFirst({
    where: { email: { equals: normalized, mode: "insensitive" } },
  });
  if (!user) {
    return { ok: true, otpSent: true };
  }

  const otp = randomOtp();
  await prisma.$executeRawUnsafe(
    `
      INSERT INTO "AuthOtpChallenge" ("id", "identifier", "otpHash", "purpose", "expiresAt")
      VALUES ($1, $2, $3, 'LOGIN', $4)
    `,
    crypto.randomUUID(),
    normalized,
    otpHash(otp),
    nowPlusMs(OTP_TTL_SECONDS * 1000)
  );

  const dev = process.env.NODE_ENV !== "production";
  return {
    ok: true,
    otpSent: true,
    ...(dev ? { otpPreview: otp } : {}),
  };
}

export async function verifyLoginOtp({ identifier, code }) {
  await ensureTables();
  const normalized = normalizeIdentifier(identifier);
  const otpCode = String(code || "").trim();
  if (!normalized || !otpCode) {
    throw new OtpVerificationError(
      OTP_FAILURE_REASON.INVALID_OTP,
      "identifier and code are required",
      1,
      400
    );
  }

  const user = await prisma.user.findFirst({
    where: { email: { equals: normalized, mode: "insensitive" } },
  });
  if (!user) {
    throw new OtpVerificationError(
      OTP_FAILURE_REASON.INVALID_OTP,
      "Invalid identifier or code",
      1
    );
  }

  const rows = await prisma.$queryRawUnsafe(
    `
      SELECT "id", "otpHash", "attempts", "expiresAt", "usedAt"
      FROM "AuthOtpChallenge"
      WHERE "identifier" = $1
        AND "purpose" = 'LOGIN'
      ORDER BY "createdAt" DESC
      LIMIT 1
    `,
    normalized
  );
  const challenge = rows?.[0];
  if (!challenge || challenge.usedAt) {
    throw new OtpVerificationError(
      OTP_FAILURE_REASON.INVALID_OTP,
      "Invalid identifier or code",
      1
    );
  }
  if (new Date(challenge.expiresAt).getTime() < Date.now()) {
    throw new OtpVerificationError(
      OTP_FAILURE_REASON.EXPIRED_OTP,
      "Code expired",
      Number(challenge.attempts || 0)
    );
  }
  if (Number(challenge.attempts || 0) >= OTP_MAX_ATTEMPTS) {
    throw new OtpVerificationError(
      OTP_FAILURE_REASON.MAX_ATTEMPTS_EXCEEDED,
      "Too many OTP attempts",
      Number(challenge.attempts || 0)
    );
  }

  const valid = safeEqualHex(challenge.otpHash, otpHash(otpCode));
  if (!valid) {
    const nextAttempts = Number(challenge.attempts || 0) + 1;
    await prisma.$executeRawUnsafe(
      `UPDATE "AuthOtpChallenge" SET "attempts" = "attempts" + 1 WHERE "id" = $1`,
      challenge.id
    );
    if (nextAttempts >= OTP_MAX_ATTEMPTS) {
      throw new OtpVerificationError(
        OTP_FAILURE_REASON.MAX_ATTEMPTS_EXCEEDED,
        "Too many OTP attempts",
        nextAttempts
      );
    }
    throw new OtpVerificationError(
      OTP_FAILURE_REASON.INVALID_OTP,
      "Invalid identifier or code",
      nextAttempts
    );
  }

  await prisma.$executeRawUnsafe(
    `UPDATE "AuthOtpChallenge" SET "usedAt" = CURRENT_TIMESTAMP WHERE "id" = $1`,
    challenge.id
  );

  const jti = crypto.randomUUID();
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user.id, jti);
  await prisma.$executeRawUnsafe(
    `
      INSERT INTO "AuthRefreshSession" ("id", "jti", "userId", "tokenHash", "expiresAt")
      VALUES ($1, $2, $3, $4, $5)
    `,
    crypto.randomUUID(),
    jti,
    user.id,
    tokenHash(refreshToken),
    nowPlusMs(REFRESH_TTL_MS)
  );

  return {
    accessToken,
    refreshToken,
    user: publicUser(user),
  };
}

export async function rotateRefreshToken(refreshToken) {
  await ensureTables();
  if (!refreshToken) throw new Error("refresh token is required");

  const payload = verifyRefreshToken(refreshToken);
  const rows = await prisma.$queryRawUnsafe(
    `
      SELECT "id", "jti", "userId", "tokenHash", "expiresAt", "revokedAt"
      FROM "AuthRefreshSession"
      WHERE "jti" = $1
      LIMIT 1
    `,
    payload.jti
  );
  const session = rows?.[0];
  if (!session) throw new Error("Invalid refresh token");
  if (session.revokedAt) throw new Error("Refresh token already revoked");
  if (new Date(session.expiresAt).getTime() < Date.now()) throw new Error("Refresh token expired");
  if (!safeEqualHex(session.tokenHash, tokenHash(refreshToken))) {
    throw new Error("Invalid refresh token");
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user) throw new Error("User no longer exists");

  const nextJti = crypto.randomUUID();
  const nextRefreshToken = signRefreshToken(user.id, nextJti);
  const nextAccessToken = signAccessToken(user);

  await prisma.$transaction([
    prisma.$executeRawUnsafe(
      `
        UPDATE "AuthRefreshSession"
        SET "revokedAt" = CURRENT_TIMESTAMP, "replacedByJti" = $2
        WHERE "id" = $1
      `,
      session.id,
      nextJti
    ),
    prisma.$executeRawUnsafe(
      `
        INSERT INTO "AuthRefreshSession" ("id", "jti", "userId", "tokenHash", "expiresAt")
        VALUES ($1, $2, $3, $4, $5)
      `,
      crypto.randomUUID(),
      nextJti,
      user.id,
      tokenHash(nextRefreshToken),
      nowPlusMs(REFRESH_TTL_MS)
    ),
  ]);

  return { accessToken: nextAccessToken, refreshToken: nextRefreshToken };
}

export async function revokeRefreshToken(refreshToken) {
  await ensureTables();
  if (!refreshToken) return;
  try {
    const payload = verifyRefreshToken(refreshToken);
    await prisma.$executeRawUnsafe(
      `
        UPDATE "AuthRefreshSession"
        SET "revokedAt" = CURRENT_TIMESTAMP
        WHERE "jti" = $1 AND "revokedAt" IS NULL
      `,
      payload.jti
    );
  } catch {
    // Ignore invalid tokens on logout.
  }
}

export async function getCurrentUser(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return null;
  return publicUser(user);
}
