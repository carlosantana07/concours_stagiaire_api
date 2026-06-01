/*
  Warnings:

  - The `delete_at` column on the `categorieConcours` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `delete_at` column on the `centre` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `delete_at` column on the `concours` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `delete_at` column on the `inscription` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `delete_at` column on the `paiement` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "categorieConcours" DROP COLUMN "delete_at",
ADD COLUMN     "delete_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "centre" DROP COLUMN "delete_at",
ADD COLUMN     "delete_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "concours" DROP COLUMN "delete_at",
ADD COLUMN     "delete_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "inscription" DROP COLUMN "delete_at",
ADD COLUMN     "delete_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "paiement" DROP COLUMN "delete_at",
ADD COLUMN     "delete_at" TIMESTAMP(3);
