CREATE TYPE "IdempotencyStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED');

CREATE TABLE "idempotency_requests" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "userId" TEXT,
    "status" "IdempotencyStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "responseStatus" INTEGER,
    "responseBody" JSONB,
    "lockedUntil" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "idempotency_requests_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "idempotency_requests_scope_key_key" ON "idempotency_requests"("scope", "key");
CREATE INDEX "idempotency_requests_userId_idx" ON "idempotency_requests"("userId");
CREATE INDEX "idempotency_requests_status_idx" ON "idempotency_requests"("status");
CREATE INDEX "idempotency_requests_expiresAt_idx" ON "idempotency_requests"("expiresAt");
CREATE INDEX "idempotency_requests_lockedUntil_idx" ON "idempotency_requests"("lockedUntil");

CREATE UNIQUE INDEX "ledger_entry_accountId_transactionId_category_key" ON "ledger_entry"("accountId", "transactionId", "category");
