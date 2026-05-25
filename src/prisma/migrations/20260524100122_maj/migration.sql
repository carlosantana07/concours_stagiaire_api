/*
  Warnings:

  - You are about to drop the column `choix_notification` on the `candidat` table. All the data in the column will be lost.
  - Made the column `email` on table `candidat` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "candidat" DROP COLUMN "choix_notification",
ALTER COLUMN "email" SET NOT NULL,
ALTER COLUMN "type_candidat" SET DEFAULT 'DIRECT';
