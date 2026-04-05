import crypto from "crypto";
import prismaPkg from "@prisma/client";
import { prisma } from "../config/db.js";

const { Prisma } = prismaPkg;
import bcrypt from "bcryptjs";
import {
  issueTokens,
  createAccessTokenFromRefreshToken,
  clearAuthCookies,
} from "../utils/generateToken.js";
import {
  sendVerificationEmail,
  sendWelcomeEmail,
  sendPasswordResetOtpEmail,
} from "../utils/emailService.js";

const DB_UNAVAILABLE_MSG =
  "Database unreachable or timed out. Open the Neon console to wake the project, check DATABASE_URL, try a \"Direct\" connection string if the pooler times out, and ensure port 5432 is not blocked (VPN / firewall).";

function isDbConnectivityError(error) {
  const code = error?.code;
  if (
    code === "P1001" ||
    code === "ETIMEDOUT" ||
    code === "ECONNREFUSED" ||
    code === "ENOTFOUND"
  ) {
    return true;
  }
  const msg = String(error?.message ?? "");
  return /Can't reach database|ETIMEDOUT|ECONNREFUSED|ENOTFOUND|connection.*(timed out|timeout)|connect timeout|P1001/i.test(
    msg
  );
}

function handleAuthError(res, error) {
  console.error(error);
  const dev = process.env.NODE_ENV !== "production";

  if (isDbConnectivityError(error)) {
    return res.status(503).json({
      error: DB_UNAVAILABLE_MSG,
      ...(dev && { code: error.code }),
    });
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return res.status(400).json({
        error: "User already exists with this email",
      });
    }
    if (error.code === "P2021" || error.code === "P2022") {
      return res.status(503).json({
        error:
          "Database schema is out of date. Run: cd backend && npx prisma migrate deploy",
        ...(dev && { code: error.code }),
      });
    }
    return res.status(500).json({
      error: "Database error",
      ...(dev && { code: error.code, detail: error.message }),
    });
  }

  if (
    String(error.message).includes("JWT_") &&
    String(error.message).includes("missing")
  ) {
    return res.status(500).json({ error: error.message });
  }

  if (error?.name === "JsonWebTokenError" || error?.name === "TokenExpiredError") {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  return res.status(500).json({
    error: "Internal Server Error",
    ...(dev && { detail: error?.message }),
  });
}

/** Postgres unique email is case-sensitive; store lowercase and match case-insensitively for login. */
function normalizeEmail(email) {
  return String(email ?? "").trim().toLowerCase();
}

async function findUserByEmailCaseInsensitive(emailNorm) {
  return prisma.user.findFirst({
    where: {
      email: { equals: emailNorm, mode: "insensitive" },
    },
  });
}

let pendingRegistrationFallbackWarned = false;

function getPendingRegistrationDelegate(client = prisma) {
  return client?.pendingRegistration;
}

function canUsePendingRegistrationDelegate(client = prisma) {
  // Keep this flow in raw SQL compatibility mode because many dev databases
  // already have a custom RegistrationPending schema that does not match Prisma model fields.
  return false;
}

function isSchemaMissingError(error) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === "P2021" || error.code === "P2022")
  );
}

function warnPendingRegistrationFallbackOnce() {
  if (pendingRegistrationFallbackWarned) return;
  pendingRegistrationFallbackWarned = true;
  console.warn(
    "[auth] Prisma client does not include PendingRegistration delegate yet. Using raw SQL fallback on RegistrationPending. Run `cd backend && npm run db:generate`."
  );
}

function mapPendingRegistrationRow(row) {
  if (!row) return null;
  return {
    id: row.id != null ? String(row.id) : null,
    name: row.name,
    email: row.email,
    password: row.password,
    emailOtpHash: row.emailOtpHash,
    emailOtpExpiresAt: row.emailOtpExpiresAt
      ? new Date(row.emailOtpExpiresAt)
      : null,
    createdAt: row.createdAt ? new Date(row.createdAt) : null,
    updatedAt: row.updatedAt ? new Date(row.updatedAt) : null,
  };
}

function quoteIdentifier(id) {
  return `"${String(id).replaceAll('"', '""')}"`;
}

async function getRegistrationPendingColumns(client = prisma) {
  const rows = await client.$queryRawUnsafe(
    `
      SELECT
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name = 'RegistrationPending'
      ORDER BY ordinal_position
    `
  );

  return (rows ?? []).map((c) => ({
    name: String(c.column_name),
    dataType: String(c.data_type ?? ""),
    isNullable: String(c.is_nullable ?? "YES") === "YES",
    hasDefault:
      c.column_default !== null && String(c.column_default ?? "").length > 0,
  }));
}

function defaultForRequiredColumn(col, known) {
  if (Object.prototype.hasOwnProperty.call(known, col.name)) {
    return known[col.name];
  }
  if (col.isNullable || col.hasDefault) {
    return undefined;
  }

  const type = col.dataType.toLowerCase();
  if (
    type.includes("character") ||
    type === "text" ||
    type.includes("citext")
  ) {
    return "";
  }
  if (type === "boolean") return false;
  if (
    type.includes("integer") ||
    type.includes("numeric") ||
    type.includes("double") ||
    type.includes("real") ||
    type.includes("decimal")
  ) {
    return 0;
  }
  if (type === "date" || type.includes("time")) {
    return new Date();
  }
  if (type === "uuid") {
    return "00000000-0000-0000-0000-000000000000";
  }

  // Best-effort fallback for unknown required types in legacy dev schemas.
  return "";
}

async function ensurePendingRegistrationTable(client = prisma) {
  warnPendingRegistrationFallbackOnce();
  await client.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "RegistrationPending" (
      "id" TEXT,
      "name" TEXT,
      "email" TEXT,
      "password" TEXT,
      "emailOtpHash" TEXT,
      "emailOtpExpiresAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await client.$executeRawUnsafe(`
    ALTER TABLE "RegistrationPending"
      ADD COLUMN IF NOT EXISTS "id" TEXT,
      ADD COLUMN IF NOT EXISTS "name" TEXT,
      ADD COLUMN IF NOT EXISTS "email" TEXT,
      ADD COLUMN IF NOT EXISTS "password" TEXT,
      ADD COLUMN IF NOT EXISTS "emailOtpHash" TEXT,
      ADD COLUMN IF NOT EXISTS "emailOtpExpiresAt" TIMESTAMP(3),
      ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
      ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
  `);
  await client.$executeRawUnsafe(`
    UPDATE "RegistrationPending"
    SET
      "id" = COALESCE(NULLIF("id", ''), md5(random()::text || clock_timestamp()::text || COALESCE("email", '')))
    WHERE "id" IS NULL OR "id" = ''
  `);
  await client.$executeRawUnsafe(`
    UPDATE "RegistrationPending"
    SET "createdAt" = CURRENT_TIMESTAMP
    WHERE "createdAt" IS NULL
  `);
  await client.$executeRawUnsafe(`
    UPDATE "RegistrationPending"
    SET "updatedAt" = CURRENT_TIMESTAMP
    WHERE "updatedAt" IS NULL
  `);
  await client.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "RegistrationPending_email_idx"
    ON "RegistrationPending" ("email")
  `);
}

async function findPendingRegistrationByEmailCaseInsensitive(
  emailNorm,
  client = prisma
) {
  if (canUsePendingRegistrationDelegate(client)) {
    try {
      return await getPendingRegistrationDelegate(client).findFirst({
        where: {
          email: { equals: emailNorm, mode: "insensitive" },
        },
      });
    } catch (error) {
      if (!isSchemaMissingError(error)) throw error;
      await ensurePendingRegistrationTable(client);
    }
  }

  await ensurePendingRegistrationTable(client);
  const rows = await client.$queryRawUnsafe(
    `
      SELECT
        "id",
        "name",
        "email",
        "password",
        "emailOtpHash",
        "emailOtpExpiresAt",
        "createdAt",
        "updatedAt"
      FROM "RegistrationPending"
      WHERE LOWER("email") = LOWER($1)
      LIMIT 1
    `,
    emailNorm
  );
  return mapPendingRegistrationRow(rows?.[0]);
}

async function savePendingRegistration(existingPending, data, client = prisma) {
  if (canUsePendingRegistrationDelegate(client)) {
    try {
      return existingPending
        ? await getPendingRegistrationDelegate(client).update({
            where: { id: existingPending.id },
            data,
          })
        : await getPendingRegistrationDelegate(client).create({
            data,
          });
    } catch (error) {
      if (!isSchemaMissingError(error)) throw error;
      await ensurePendingRegistrationTable(client);
    }
  }

  await ensurePendingRegistrationTable(client);
  const columns = await getRegistrationPendingColumns(client);
  const available = new Set(columns.map((c) => c.name));

  if (existingPending?.id) {
    const patch = {
      name: data.name,
      email: data.email,
      password: data.password,
      emailOtpHash: data.emailOtpHash,
      emailOtpExpiresAt: data.emailOtpExpiresAt,
      updatedAt: new Date(),
    };
    const sets = [];
    const values = [];
    let i = 1;
    for (const [key, value] of Object.entries(patch)) {
      if (!available.has(key)) continue;
      sets.push(`${quoteIdentifier(key)} = $${i++}`);
      values.push(value);
    }

    if (sets.length > 0) {
      values.push(existingPending.id);
      await client.$executeRawUnsafe(
        `
          UPDATE "RegistrationPending"
          SET ${sets.join(", ")}
          WHERE "id" = $${i}
        `,
        ...values
      );
    }

    const rows = await client.$queryRawUnsafe(
      `
        SELECT
          "id",
          "name",
          "email",
          "password",
          "emailOtpHash",
          "emailOtpExpiresAt",
          "createdAt",
          "updatedAt"
        FROM "RegistrationPending"
        WHERE "id" = $1
        LIMIT 1
      `,
      existingPending.id
    );
    return mapPendingRegistrationRow(rows?.[0]);
  }

  const pendingId = crypto.randomUUID();
  const knownValues = {
    id: pendingId,
    name: data.name,
    email: data.email,
    password: data.password,
    emailOtpHash: data.emailOtpHash,
    emailOtpExpiresAt: data.emailOtpExpiresAt,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const insertCols = [];
  const insertValues = [];
  const placeholders = [];
  let idx = 1;
  for (const col of columns) {
    const value = defaultForRequiredColumn(col, knownValues);
    if (value === undefined) continue;
    insertCols.push(quoteIdentifier(col.name));
    insertValues.push(value);
    placeholders.push(`$${idx++}`);
  }

  if (insertCols.length === 0) {
    throw new Error(
      "RegistrationPending table has no writable columns. Please verify its schema."
    );
  }

  await client.$executeRawUnsafe(
    `
      INSERT INTO "RegistrationPending" (${insertCols.join(", ")})
      VALUES (${placeholders.join(", ")})
    `,
    ...insertValues
  );

  const rows = await client.$queryRawUnsafe(
    `
      SELECT
        "id",
        "name",
        "email",
        "password",
        "emailOtpHash",
        "emailOtpExpiresAt",
        "createdAt",
        "updatedAt"
      FROM "RegistrationPending"
      WHERE "id" = $1
      LIMIT 1
    `,
    pendingId
  );
  return mapPendingRegistrationRow(rows?.[0]);
}

async function updatePendingRegistrationOtp(
  pendingId,
  emailOtpHash,
  otpExpiresAt,
  client = prisma
) {
  if (canUsePendingRegistrationDelegate(client)) {
    try {
      await getPendingRegistrationDelegate(client).update({
        where: { id: pendingId },
        data: {
          emailOtpHash,
          emailOtpExpiresAt: otpExpiresAt,
        },
      });
      return;
    } catch (error) {
      if (!isSchemaMissingError(error)) throw error;
      await ensurePendingRegistrationTable(client);
    }
  }

  await ensurePendingRegistrationTable(client);
  await client.$executeRawUnsafe(
      `
      UPDATE "RegistrationPending"
      SET
        "emailOtpHash" = $2,
        "emailOtpExpiresAt" = $3,
        "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = $1
    `,
    pendingId,
    emailOtpHash,
    otpExpiresAt
  );
}

async function deletePendingRegistrationById(pendingId, client = prisma) {
  if (canUsePendingRegistrationDelegate(client)) {
    try {
      await getPendingRegistrationDelegate(client).delete({
        where: { id: pendingId },
      });
      return;
    } catch (error) {
      if (!isSchemaMissingError(error)) throw error;
      await ensurePendingRegistrationTable(client);
    }
  }

  await ensurePendingRegistrationTable(client);
  await client.$executeRawUnsafe(
    `DELETE FROM "RegistrationPending" WHERE "id" = $1`,
    pendingId
  );
}

function generateSixDigitOtp() {
  return String(crypto.randomInt(100_000, 1_000_000));
}

function emailOtpExpiresAt() {
  const minutes = Number(process.env.EMAIL_OTP_EXPIRES_MINUTES) || 15;
  return new Date(Date.now() + minutes * 60 * 1000);
}

function passwordResetOtpExpiresInSeconds() {
  const seconds = Number(process.env.PASSWORD_RESET_OTP_EXPIRES_SECONDS) || 90;
  return seconds > 0 ? seconds : 90;
}

function passwordResetOtpExpiresAt() {
  return new Date(Date.now() + passwordResetOtpExpiresInSeconds() * 1000);
}

function isOtpExpired(dateValue) {
  const ts = new Date(dateValue).getTime();
  return !Number.isFinite(ts) || ts < Date.now();
}

function emailDeliveryErrorPayload(emailResult) {
  return {
    reason: emailResult?.reason ?? "unknown",
    code: emailResult?.errorCode ?? null,
    responseCode: emailResult?.responseCode ?? null,
    command: emailResult?.command ?? null,
  };
}

function logOtpInDevFallback(email, otp, emailResult) {
  const dev = process.env.NODE_ENV !== "production";
  if (!dev) return;
  console.info(`[dev] Email verification OTP for ${email}: ${otp}`);
  if (emailResult?.errorCode || emailResult?.reason) {
    console.info(
      `[dev] Email delivery failure reason: ${emailResult?.reason ?? "unknown"}, code: ${
        emailResult?.errorCode ?? "n/a"
      }, responseCode: ${emailResult?.responseCode ?? "n/a"}`
    );
  }
}

async function assignPendingOtpAndNotify(pendingId, email, plainOtp) {
  const emailOtpHash = await bcrypt.hash(plainOtp, 10);
  await updatePendingRegistrationOtp(
    pendingId,
    emailOtpHash,
    emailOtpExpiresAt(),
    prisma
  );

  const emailResult = await sendVerificationEmail(email, plainOtp);
  if (emailResult?.ok !== true) {
    logOtpInDevFallback(email, plainOtp, emailResult);
  }
  return emailResult;
}

async function assignLegacyUserOtpAndNotify(userId, email, plainOtp) {
  const emailOtpHash = await bcrypt.hash(plainOtp, 10);
  await prisma.user.update({
    where: { id: userId },
    data: {
      emailOtpHash,
      emailOtpExpiresAt: emailOtpExpiresAt(),
    },
  });

  const emailResult = await sendVerificationEmail(email, plainOtp);
  if (emailResult?.ok !== true) {
    logOtpInDevFallback(email, plainOtp, emailResult);
  }
  return emailResult;
}

const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name?.trim() || !email?.trim() || !password) {
      return res.status(400).json({
        error: "name, email, and password are required",
      });
    }

    const emailNorm = normalizeEmail(email);

    const userExist = await findUserByEmailCaseInsensitive(emailNorm);

    if (userExist?.emailVerified) {
      return res
        .status(400)
        .json({ error: "User already exists with this email" });
    }

    // Clean up legacy unverified rows from the older flow (user created before OTP).
    if (userExist && !userExist.emailVerified) {
      await prisma.user.delete({ where: { id: userExist.id } });
    }

    const salt = await bcrypt.genSalt(10);
    const hashPassword = await bcrypt.hash(String(password), salt);
    const otp = generateSixDigitOtp();
    const emailOtpHash = await bcrypt.hash(otp, 10);
    const existingPending = await findPendingRegistrationByEmailCaseInsensitive(
      emailNorm
    );

    const pending = await savePendingRegistration(
      existingPending,
      {
        name: name.trim(),
        email: emailNorm,
        password: hashPassword,
        emailOtpHash,
        emailOtpExpiresAt: emailOtpExpiresAt(),
      },
      prisma
    );

    const emailResult = await sendVerificationEmail(pending.email, otp);
    const emailSent = emailResult?.ok === true;
    if (!emailSent) {
      logOtpInDevFallback(pending.email, otp, emailResult);
    }
    const dev = process.env.NODE_ENV !== "production";

    return res.status(201).json({
      status: "Success",
      data: {
        needsEmailVerification: true,
        email: pending.email,
        message: emailSent
          ? `OTP sent to ${pending.email}. Check your inbox for the 6-digit verification code.`
          : dev
            ? "Email could not be delivered; check SMTP credentials. The OTP was printed in the server console (development only)."
            : "Email could not be sent. Check SMTP credentials, then use resend verification.",
        ...(dev &&
          !emailSent && {
            emailDeliveryError: emailDeliveryErrorPayload(emailResult),
          }),
      },
    });
  } catch (error) {
    return handleAuthError(res, error);
  }
};

const verifyEmail = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const emailNorm = normalizeEmail(email);
    const pending = await findPendingRegistrationByEmailCaseInsensitive(emailNorm);

    // New flow: create the user row only after OTP verification succeeds.
    if (pending) {
      const pendingExpiry = new Date(pending.emailOtpExpiresAt).getTime();
      if (!Number.isFinite(pendingExpiry) || pendingExpiry < Date.now()) {
        return res.status(400).json({
          error: "Verification code expired. Request a new code.",
        });
      }

      const match = await bcrypt.compare(String(otp).trim(), pending.emailOtpHash);
      if (!match) {
        return res.status(400).json({ error: "Invalid verification code" });
      }

      const { user, alreadyVerified } = await prisma.$transaction(async (tx) => {
        const existingUser = await tx.user.findFirst({
          where: {
            email: { equals: emailNorm, mode: "insensitive" },
          },
        });

        if (existingUser?.emailVerified) {
          await deletePendingRegistrationById(pending.id, tx);
          return { user: existingUser, alreadyVerified: true };
        }

        const verifiedUser = existingUser
          ? await tx.user.update({
              where: { id: existingUser.id },
              data: {
                name: pending.name,
                email: emailNorm,
                password: pending.password,
                emailVerified: true,
                emailOtpHash: null,
                emailOtpExpiresAt: null,
              },
            })
          : await tx.user.create({
              data: {
                name: pending.name,
                email: emailNorm,
                password: pending.password,
                emailVerified: true,
                emailOtpHash: null,
                emailOtpExpiresAt: null,
              },
            });

        await deletePendingRegistrationById(pending.id, tx);
        return { user: verifiedUser, alreadyVerified: false };
      });

      const accessToken = issueTokens(user.id, res);
      if (!alreadyVerified) {
        void sendWelcomeEmail(user.email, user.name);
      }

      return res.status(200).json({
        status: "Success",
        data: {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            emailVerified: true,
          },
          accessToken,
        },
      });
    }

    // Legacy fallback: existing rows created before the pending-registration flow.
    const user = await findUserByEmailCaseInsensitive(emailNorm);
    if (!user) {
      return res.status(400).json({ error: "Invalid email or code" });
    }

    if (user.emailVerified) {
      const accessToken = issueTokens(user.id, res);
      return res.status(200).json({
        status: "Success",
        data: {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            emailVerified: true,
          },
          accessToken,
        },
      });
    }

    if (!user.emailOtpHash || !user.emailOtpExpiresAt) {
      return res.status(400).json({
        error: "No verification code is active. Use resend to get a new code.",
      });
    }

    if (user.emailOtpExpiresAt.getTime() < Date.now()) {
      return res.status(400).json({
        error: "Verification code expired. Request a new code.",
      });
    }

    const match = await bcrypt.compare(String(otp).trim(), user.emailOtpHash);
    if (!match) {
      return res.status(400).json({ error: "Invalid verification code" });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailOtpHash: null,
        emailOtpExpiresAt: null,
      },
    });

    const accessToken = issueTokens(user.id, res);
    void sendWelcomeEmail(user.email, user.name);

    return res.status(200).json({
      status: "Success",
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          emailVerified: true,
        },
        accessToken,
      },
    });
  } catch (error) {
    return handleAuthError(res, error);
  }
};

const resendVerification = async (req, res) => {
  try {
    const emailNorm = normalizeEmail(req.body.email);
    const pending = await findPendingRegistrationByEmailCaseInsensitive(emailNorm);

    let emailResult;
    if (pending) {
      const otp = generateSixDigitOtp();
      emailResult = await assignPendingOtpAndNotify(pending.id, pending.email, otp);
    } else {
      // Legacy fallback for older unverified rows.
      const user = await findUserByEmailCaseInsensitive(emailNorm);
      if (!user) {
        return res.status(404).json({
          error: "No pending registration found for this email. Register first.",
        });
      }

      if (user.emailVerified) {
        return res.status(400).json({ error: "This email is already verified" });
      }

      const otp = generateSixDigitOtp();
      emailResult = await assignLegacyUserOtpAndNotify(user.id, user.email, otp);
    }

    const emailSent = emailResult?.ok === true;

    const dev = process.env.NODE_ENV !== "production";
    return res.status(200).json({
      status: "Success",
      message: emailSent
        ? "A new verification code was sent to your email."
        : dev
          ? "Email could not be delivered; check SMTP credentials. OTP is in the server console (development only)."
          : "Email could not be sent. Check SMTP credentials and try resend verification.",
      ...(dev &&
        !emailSent && {
          emailDeliveryError: emailDeliveryErrorPayload(emailResult),
        }),
    });
  } catch (error) {
    return handleAuthError(res, error);
  }
};

const requestPasswordResetOtp = async (req, res) => {
  try {
    const emailNorm = normalizeEmail(req.body.email);
    const user = await findUserByEmailCaseInsensitive(emailNorm);
    if (!user) {
      return res.status(404).json({ error: "No account found for this email" });
    }

    if (!user.emailVerified) {
      return res.status(400).json({
        error: "Please verify your email before resetting password.",
        needsEmailVerification: true,
        email: user.email,
      });
    }

    const otp = generateSixDigitOtp();
    const otpHash = await bcrypt.hash(otp, 10);
    const otpExpiresAt = passwordResetOtpExpiresAt();
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailOtpHash: otpHash,
        emailOtpExpiresAt: otpExpiresAt,
      },
    });

    const validForSeconds = passwordResetOtpExpiresInSeconds();
    const emailResult = await sendPasswordResetOtpEmail(
      user.email,
      otp,
      validForSeconds
    );
    const emailSent = emailResult?.ok === true;
    if (!emailSent) {
      logOtpInDevFallback(user.email, otp, emailResult);
    }

    const dev = process.env.NODE_ENV !== "production";
    return res.status(200).json({
      status: "Success",
      data: {
        email: user.email,
        otpExpiresInSeconds: validForSeconds,
        message: emailSent
          ? `OTP sent to ${user.email}. It expires in ${validForSeconds} seconds.`
          : dev
            ? "Email could not be delivered; OTP is printed in server console (development only)."
            : "Email could not be sent. Check SMTP credentials and try again.",
        ...(dev &&
          !emailSent && {
            emailDeliveryError: emailDeliveryErrorPayload(emailResult),
          }),
      },
    });
  } catch (error) {
    return handleAuthError(res, error);
  }
};

const verifyPasswordResetOtp = async (req, res) => {
  try {
    const emailNorm = normalizeEmail(req.body.email);
    const otp = String(req.body.otp ?? "").trim();
    const user = await findUserByEmailCaseInsensitive(emailNorm);
    if (!user) {
      return res.status(400).json({ error: "Invalid email or code" });
    }

    if (!user.emailOtpHash || !user.emailOtpExpiresAt) {
      return res.status(400).json({
        error: "No reset code is active. Generate a new OTP.",
      });
    }

    if (isOtpExpired(user.emailOtpExpiresAt)) {
      return res.status(400).json({
        error: "Reset OTP expired. Generate a new OTP.",
      });
    }

    const match = await bcrypt.compare(otp, user.emailOtpHash);
    if (!match) {
      return res.status(400).json({ error: "Invalid reset OTP" });
    }

    return res.status(200).json({
      status: "Success",
      data: {
        email: user.email,
        message: "OTP verified. You can now set a new password.",
      },
    });
  } catch (error) {
    return handleAuthError(res, error);
  }
};

const resetPassword = async (req, res) => {
  try {
    const emailNorm = normalizeEmail(req.body.email);
    const otp = String(req.body.otp ?? "").trim();
    const newPassword = String(req.body.newPassword ?? "");

    const user = await findUserByEmailCaseInsensitive(emailNorm);
    if (!user) {
      return res.status(400).json({ error: "Invalid email or code" });
    }

    if (!user.emailOtpHash || !user.emailOtpExpiresAt) {
      return res.status(400).json({
        error: "No reset code is active. Generate a new OTP.",
      });
    }

    if (isOtpExpired(user.emailOtpExpiresAt)) {
      return res.status(400).json({
        error: "Reset OTP expired. Generate a new OTP.",
      });
    }

    const match = await bcrypt.compare(otp, user.emailOtpHash);
    if (!match) {
      return res.status(400).json({ error: "Invalid reset OTP" });
    }

    const isOldPassword = await bcrypt.compare(newPassword, user.password);
    if (isOldPassword) {
      return res.status(400).json({
        error: "New password must be different from your current password.",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashPassword = await bcrypt.hash(newPassword, salt);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashPassword,
        emailOtpHash: null,
        emailOtpExpiresAt: null,
      },
    });

    clearAuthCookies(res);
    return res.status(200).json({
      status: "Success",
      message: "Password reset successful. Please login with your new password.",
    });
  } catch (error) {
    return handleAuthError(res, error);
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email?.trim() || !password) {
      return res.status(400).json({
        error: "email and password are required",
      });
    }

    const emailNorm = normalizeEmail(email);

    const user = await findUserByEmailCaseInsensitive(emailNorm);

    if (!user) {
      const pending = await findPendingRegistrationByEmailCaseInsensitive(emailNorm);
      if (pending) {
        return res.status(403).json({
          error:
            "Please verify your email before signing in. Complete OTP verification to finish account creation.",
          needsEmailVerification: true,
          email: pending.email,
        });
      }
      return res
        .status(401)
        .json({ error: "Invalid email or password" });
    }

    const match = await bcrypt.compare(String(password), user.password);
    if (!match) {
      return res
        .status(401)
        .json({ error: "Invalid email or password" });
    }

    if (!user.emailVerified) {
      return res.status(403).json({
        error: "Please verify your email before signing in.",
        needsEmailVerification: true,
        email: user.email,
      });
    }

    const accessToken = issueTokens(user.id, res);

    return res.status(200).json({
      status: "Success",
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          emailVerified: user.emailVerified,
        },
        accessToken,
      },
    });
  } catch (error) {
    return handleAuthError(res, error);
  }
};

const refresh = async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      clearAuthCookies(res);
      return res.status(401).json({ error: "No refresh token" });
    }

    const accessToken = createAccessTokenFromRefreshToken(refreshToken, res);
    if (!accessToken) {
      return res.status(401).json({ error: "Invalid or expired refresh token" });
    }

    return res.status(200).json({
      status: "Success",
      data: { accessToken },
    });
  } catch (error) {
    return handleAuthError(res, error);
  }
};

const logout = async (req, res) => {
  clearAuthCookies(res);

  return res.status(200).json({
    status: "Success",
    message: "Logged out successfully",
  });
};

const deleteAccount = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email?.trim() || !password) {
      return res.status(400).json({
        error: "email and password are required",
      });
    }

    const emailNorm = normalizeEmail(email);

    const user = await findUserByEmailCaseInsensitive(emailNorm);

    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const match = await bcrypt.compare(String(password), user.password);
    if (!match) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    await prisma.user.delete({
      where: { id: user.id },
    });

    return res.status(200).json({ message: "Account deleted successfully" });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return res.status(404).json({ error: "Account not found" });
    }
    return handleAuthError(res, error);
  }
};

export {
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
};
