/*
  Warnings:

  - Added the required column `id_concours` to the `resultat` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "resultat" ADD COLUMN     "delete_at" TIMESTAMP(3),
ADD COLUMN     "id_concours" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "resultat" ADD CONSTRAINT "resultat_id_concours_fkey" FOREIGN KEY ("id_concours") REFERENCES "concours"("id_concours") ON DELETE NO ACTION ON UPDATE CASCADE;
