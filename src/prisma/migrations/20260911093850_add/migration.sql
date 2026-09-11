/*
  Warnings:

  - The values [DIPLOME] on the enum `TypeDocument` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `id_inscription` on the `document` table. All the data in the column will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "TypeDocument_new" AS ENUM ('CEP', 'BEPC', 'BEP', 'BAC', 'LICENCE', 'MASTER', 'DOCTORAT', 'CNIB', 'PASSPORT', 'NATIONALITE');
ALTER TABLE "document" ALTER COLUMN "type_document" TYPE "TypeDocument_new" USING ("type_document"::text::"TypeDocument_new");
ALTER TYPE "TypeDocument" RENAME TO "TypeDocument_old";
ALTER TYPE "TypeDocument_new" RENAME TO "TypeDocument";
DROP TYPE "TypeDocument_old";
COMMIT;

-- AlterTable
ALTER TABLE "document" DROP COLUMN "id_inscription";
