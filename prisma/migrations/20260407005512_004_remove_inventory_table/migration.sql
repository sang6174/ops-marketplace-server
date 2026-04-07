/*
  Warnings:

  - You are about to drop the `inventories` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "inventories" DROP CONSTRAINT "inventories_variantId_fkey";

-- DropTable
DROP TABLE "inventories";
