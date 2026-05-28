-- AlterTable
ALTER TABLE "shippings"
ADD COLUMN "fee" DECIMAL(12, 2),
ADD COLUMN "labelUrl" TEXT,
ADD COLUMN "providerRequest" JSONB,
ADD COLUMN "providerResponse" JSONB,
ADD COLUMN "lastWebhookPayload" JSONB,
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "shippings_provider_idx" ON "shippings"("provider");
