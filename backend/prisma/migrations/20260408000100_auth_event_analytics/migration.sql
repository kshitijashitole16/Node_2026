-- Create enums for auth analytics events
CREATE TYPE "AuthEventType" AS ENUM ('LOGIN', 'OTP_EMAIL_VERIFICATION', 'OTP_PASSWORD_RESET');
CREATE TYPE "AuthEventStatus" AS ENUM ('SUCCESS', 'FAILURE');

-- Create auth event table
CREATE TABLE "AuthEvent" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "eventType" "AuthEventType" NOT NULL,
  "status" "AuthEventStatus" NOT NULL,
  "ipAddress" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AuthEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AuthEvent_createdAt_idx" ON "AuthEvent"("createdAt");
CREATE INDEX "AuthEvent_eventType_status_createdAt_idx" ON "AuthEvent"("eventType", "status", "createdAt");
CREATE INDEX "AuthEvent_userId_createdAt_idx" ON "AuthEvent"("userId", "createdAt");

ALTER TABLE "AuthEvent"
ADD CONSTRAINT "AuthEvent_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
