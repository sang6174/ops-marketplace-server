UPDATE "payments"
SET "provider" = NULL
WHERE "provider"::text IN ('MOMO', 'PAYPAL');

CREATE TYPE "PaymentProvider_new" AS ENUM ('STRIPE');

ALTER TABLE "payments"
ALTER COLUMN "provider" TYPE "PaymentProvider_new"
USING "provider"::text::"PaymentProvider_new";

DROP TYPE "PaymentProvider";

ALTER TYPE "PaymentProvider_new" RENAME TO "PaymentProvider";
