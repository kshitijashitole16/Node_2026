-- Email OTP verification (idempotent if columns already exist on Neon)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerified" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailOtpHash" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailOtpExpiresAt" TIMESTAMP(3);
