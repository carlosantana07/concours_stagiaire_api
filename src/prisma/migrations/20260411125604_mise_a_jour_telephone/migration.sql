/*
  Warnings:

  - You are about to alter the column `telephone` on the `candidat` table. The data in that column could be lost. The data in that column will be cast from `VarChar(20)` to `VarChar(11)`.
  - A unique constraint covering the columns `[telephone]` on the table `candidat` will be added. If there are existing duplicate values, this will fail.
  - Made the column `lieu_naissance` on table `candidat` required. This step will fail if there are existing NULL values in that column.
  - Made the column `pays_naissance` on table `candidat` required. This step will fail if there are existing NULL values in that column.
  - Made the column `date_delivrance` on table `candidat` required. This step will fail if there are existing NULL values in that column.
  - Made the column `telephone` on table `candidat` required. This step will fail if there are existing NULL values in that column.
  - Changed the type of `statut_inscription` on the `inscription` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
-- Type StatutInscription déjà existant
-- AlterTable
ALTER TABLE "candidat" ALTER COLUMN "lieu_naissance" SET NOT NULL,
ALTER COLUMN "pays_naissance" SET NOT NULL,
ALTER COLUMN "date_delivrance" SET NOT NULL,
ALTER COLUMN "telephone" SET NOT NULL,
ALTER COLUMN "telephone" SET DATA TYPE VARCHAR(11);

-- AlterTable
ALTER TABLE "concours" ALTER COLUMN "statut_concours" SET DEFAULT 'Attente';

-- AlterTable
-- ALTER TABLE "inscription" DROP COLUMN "statut_inscription",
-- ADD COLUMN     "statut_inscription" "StatutInscription" NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "candidat_telephone_key" ON "candidat"("telephone");
