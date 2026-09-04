/*
  Warnings:

  - You are about to drop the column `moyenne_generale` on the `resultat` table. All the data in the column will be lost.
  - You are about to drop the column `note` on the `resultat` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "StatutResultat" AS ENUM ('REUSSI', 'AJOURNE', 'ATTENTE');

-- AlterTable
ALTER TABLE "resultat" DROP COLUMN "moyenne_generale",
DROP COLUMN "note",
ADD COLUMN     "note_cg" DECIMAL(5,2),
ADD COLUMN     "note_sp" DECIMAL(5,2);
