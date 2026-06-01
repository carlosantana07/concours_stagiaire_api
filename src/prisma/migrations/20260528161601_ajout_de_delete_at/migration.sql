/*
  Warnings:

  - You are about to drop the column `deletedAt` on the `categorieConcours` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "categorieConcours" DROP COLUMN "deletedAt",
ADD COLUMN     "delete_at" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "centre" ADD COLUMN     "delete_at" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "concours" ADD COLUMN     "delete_at" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "inscription" ADD COLUMN     "delete_at" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "paiement" ADD COLUMN     "delete_at" BOOLEAN NOT NULL DEFAULT false;
