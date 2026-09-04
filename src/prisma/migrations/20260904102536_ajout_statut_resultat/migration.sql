/*
  Warnings:

  - You are about to drop the column `coefficient` on the `examen` table. All the data in the column will be lost.
  - The `statut` column on the `resultat` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterEnum
ALTER TYPE "StatutResultat" ADD VALUE 'INDISPONIBLE';

-- AlterTable
ALTER TABLE "examen" DROP COLUMN "coefficient";

-- AlterTable
ALTER TABLE "resultat" DROP COLUMN "statut",
ADD COLUMN     "statut" "StatutResultat";
