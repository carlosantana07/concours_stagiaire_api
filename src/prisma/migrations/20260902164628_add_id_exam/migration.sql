/*
  Warnings:

  - You are about to drop the column `id_concours` on the `composer` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[id_candidat,id_examen]` on the table `composer` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `id_examen` to the `composer` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "TypeDocument" ADD VALUE 'DIPLOME';

-- DropForeignKey
ALTER TABLE "composer" DROP CONSTRAINT "composer_id_concours_fkey";

-- DropIndex
DROP INDEX "composer_id_candidat_id_concours_key";

-- AlterTable
ALTER TABLE "composer" DROP COLUMN "id_concours",
ADD COLUMN     "concoursId_concours" INTEGER,
ADD COLUMN     "id_examen" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "composer_id_candidat_id_examen_key" ON "composer"("id_candidat", "id_examen");

-- AddForeignKey
ALTER TABLE "composer" ADD CONSTRAINT "composer_id_examen_fkey" FOREIGN KEY ("id_examen") REFERENCES "examen"("id_examen") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "composer" ADD CONSTRAINT "composer_concoursId_concours_fkey" FOREIGN KEY ("concoursId_concours") REFERENCES "concours"("id_concours") ON DELETE SET NULL ON UPDATE CASCADE;
