/*
  Warnings:

  - The values [MOMO] on the enum `PaymentMethod` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `data` on the `AuditLog` table. All the data in the column will be lost.
  - You are about to drop the column `deletedAt` on the `cart_items` table. All the data in the column will be lost.
  - You are about to drop the column `isDeleted` on the `cart_items` table. All the data in the column will be lost.
  - You are about to drop the column `deletedAt` on the `carts` table. All the data in the column will be lost.
  - You are about to drop the column `isDeleted` on the `carts` table. All the data in the column will be lost.
  - You are about to drop the column `available` on the `inventories` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `inventories` table. All the data in the column will be lost.
  - You are about to drop the column `deletedAt` on the `inventories` table. All the data in the column will be lost.
  - You are about to drop the column `isDeleted` on the `inventories` table. All the data in the column will be lost.
  - You are about to drop the column `skuSnapshot` on the `order_items` table. All the data in the column will be lost.
  - You are about to drop the column `orderId` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `rawResponse` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `transactionId` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `hasVariants` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `isDeleted` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `price` on the `products` table. All the data in the column will be lost.
  - You are about to drop the `bank_accounts` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `payouts` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[slug]` on the table `categories` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[slug]` on the table `products` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `price` to the `cart_items` table without a default value. This is not possible if the table is not empty.
  - Added the required column `slug` to the `categories` table without a default value. This is not possible if the table is not empty.
  - Added the required column `stock` to the `inventories` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sku` to the `order_items` table without a default value. This is not possible if the table is not empty.
  - Added the required column `variantName` to the `order_items` table without a default value. This is not possible if the table is not empty.
  - Made the column `shopId` on table `order_items` required. This step will fail if there are existing NULL values in that column.
  - Made the column `productName` on table `order_items` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `shopId` to the `orders` table without a default value. This is not possible if the table is not empty.
  - Made the column `userId` on table `orders` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `userId` to the `payments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `product_variants` table without a default value. This is not possible if the table is not empty.
  - Added the required column `slug` to the `products` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CartStatus" AS ENUM ('ACTIVE', 'CHECKING_OUT', 'COMPLETED', 'EXPIRED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "LedgerAccountType" AS ENUM ('PLATFORM_MAIN', 'PLATFORM_FEE', 'BUYER_WALLET', 'SELLER_BALANCE', 'SELLER_AVAILABLE');

-- CreateEnum
CREATE TYPE "LedgerEntryType" AS ENUM ('DEBIT', 'CREDIT');

-- CreateEnum
CREATE TYPE "LedgerEntryCategory" AS ENUM ('PAYMENT', 'PAYOUT', 'REFUND', 'FEE', 'ADJUSTMENT');

-- AlterEnum
BEGIN;
CREATE TYPE "PaymentMethod_new" AS ENUM ('COD', 'ONLINE');
ALTER TABLE "payments" ALTER COLUMN "method" TYPE "PaymentMethod_new" USING ("method"::text::"PaymentMethod_new");
ALTER TYPE "PaymentMethod" RENAME TO "PaymentMethod_old";
ALTER TYPE "PaymentMethod_new" RENAME TO "PaymentMethod";
DROP TYPE "public"."PaymentMethod_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "bank_accounts" DROP CONSTRAINT "bank_accounts_userId_fkey";

-- DropForeignKey
ALTER TABLE "carts" DROP CONSTRAINT "carts_userId_fkey";

-- DropForeignKey
ALTER TABLE "order_items" DROP CONSTRAINT "order_items_shopId_fkey";

-- DropForeignKey
ALTER TABLE "orders" DROP CONSTRAINT "orders_userId_fkey";

-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_orderId_fkey";

-- DropForeignKey
ALTER TABLE "payouts" DROP CONSTRAINT "payouts_bankAccountId_fkey";

-- DropForeignKey
ALTER TABLE "payouts" DROP CONSTRAINT "payouts_sellerId_fkey";

-- DropIndex
DROP INDEX "inventories_available_idx";

-- DropIndex
DROP INDEX "payments_orderId_key";

-- DropIndex
DROP INDEX "products_isDeleted_idx";

-- AlterTable
ALTER TABLE "AuditLog" DROP COLUMN "data",
ADD COLUMN     "actorId" TEXT,
ADD COLUMN     "actorType" TEXT,
ADD COLUMN     "after" JSONB,
ADD COLUMN     "before" JSONB,
ADD COLUMN     "metadata" JSONB;

-- AlterTable
ALTER TABLE "cart_items" DROP COLUMN "deletedAt",
DROP COLUMN "isDeleted",
ADD COLUMN     "price" DECIMAL(12,2) NOT NULL;

-- AlterTable
ALTER TABLE "carts" DROP COLUMN "deletedAt",
DROP COLUMN "isDeleted",
ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "status" "CartStatus" NOT NULL DEFAULT 'ACTIVE',
ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "slug" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "inventories" DROP COLUMN "available",
DROP COLUMN "createdAt",
DROP COLUMN "deletedAt",
DROP COLUMN "isDeleted",
ADD COLUMN     "stock" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "order_items" DROP COLUMN "skuSnapshot",
ADD COLUMN     "sku" TEXT NOT NULL,
ADD COLUMN     "variantName" TEXT NOT NULL,
ALTER COLUMN "shopId" SET NOT NULL,
ALTER COLUMN "productName" SET NOT NULL;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "shopId" TEXT NOT NULL,
ALTER COLUMN "userId" SET NOT NULL;

-- AlterTable
ALTER TABLE "payments" DROP COLUMN "orderId",
DROP COLUMN "rawResponse",
DROP COLUMN "transactionId",
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'VND',
ADD COLUMN     "providerRef" TEXT,
ADD COLUMN     "userId" TEXT NOT NULL,
ALTER COLUMN "provider" DROP NOT NULL;

-- AlterTable
ALTER TABLE "product_variants" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "name" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "products" DROP COLUMN "hasVariants",
DROP COLUMN "isDeleted",
DROP COLUMN "price",
ADD COLUMN     "maxPrice" DECIMAL(12,2),
ADD COLUMN     "minPrice" DECIMAL(12,2),
ADD COLUMN     "slug" TEXT NOT NULL,
ADD COLUMN     "status" "ProductStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "totalStock" INTEGER NOT NULL DEFAULT 0;

-- DropTable
DROP TABLE "bank_accounts";

-- DropTable
DROP TABLE "payouts";

-- CreateTable
CREATE TABLE "BankAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "accountNo" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BankAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payout" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "status" "PayoutStatus" NOT NULL,
    "method" TEXT,
    "reference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_items" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "payment_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_accounts" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT,
    "type" "LedgerAccountType" NOT NULL,
    "balance" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_entry" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "type" "LedgerEntryType" NOT NULL,
    "reference" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "category" "LedgerEntryCategory" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_entry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BankAccount_userId_idx" ON "BankAccount"("userId");

-- CreateIndex
CREATE INDEX "Payout_userId_idx" ON "Payout"("userId");

-- CreateIndex
CREATE INDEX "Payout_status_idx" ON "Payout"("status");

-- CreateIndex
CREATE INDEX "payment_items_orderId_idx" ON "payment_items"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "payment_items_paymentId_orderId_key" ON "payment_items"("paymentId", "orderId");

-- CreateIndex
CREATE INDEX "ledger_accounts_ownerId_idx" ON "ledger_accounts"("ownerId");

-- CreateIndex
CREATE INDEX "ledger_accounts_type_idx" ON "ledger_accounts"("type");

-- CreateIndex
CREATE UNIQUE INDEX "ledger_accounts_ownerId_type_key" ON "ledger_accounts"("ownerId", "type");

-- CreateIndex
CREATE INDEX "ledger_entry_accountId_idx" ON "ledger_entry"("accountId");

-- CreateIndex
CREATE INDEX "ledger_entry_transactionId_idx" ON "ledger_entry"("transactionId");

-- CreateIndex
CREATE INDEX "ledger_entry_reference_idx" ON "ledger_entry"("reference");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");

-- CreateIndex
CREATE INDEX "carts_userId_idx" ON "carts"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE INDEX "inventories_stock_idx" ON "inventories"("stock");

-- CreateIndex
CREATE INDEX "orders_shopId_idx" ON "orders"("shopId");

-- CreateIndex
CREATE INDEX "payments_userId_idx" ON "payments"("userId");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE INDEX "payments_providerRef_idx" ON "payments"("providerRef");

-- CreateIndex
CREATE INDEX "product_variants_productId_idx" ON "product_variants"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "products_slug_key" ON "products"("slug");

-- CreateIndex
CREATE INDEX "products_name_idx" ON "products"("name");

-- CreateIndex
CREATE INDEX "products_minPrice_maxPrice_idx" ON "products"("minPrice", "maxPrice");

-- CreateIndex
CREATE INDEX "products_status_idx" ON "products"("status");

-- AddForeignKey
ALTER TABLE "BankAccount" ADD CONSTRAINT "BankAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carts" ADD CONSTRAINT "carts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_items" ADD CONSTRAINT "payment_items_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_items" ADD CONSTRAINT "payment_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Fix invalid data
UPDATE inventories
SET stock = GREATEST(stock, 0),
    reserved = GREATEST(reserved, 0);

UPDATE inventories
SET reserved = LEAST(reserved, stock);

-- Add constraints
ALTER TABLE inventories
ADD CONSTRAINT check_stock_non_negative CHECK (stock >= 0);

ALTER TABLE inventories
ADD CONSTRAINT check_reserved_non_negative CHECK (reserved >= 0);

ALTER TABLE inventories
ADD CONSTRAINT check_stock_reserved CHECK (stock >= reserved);