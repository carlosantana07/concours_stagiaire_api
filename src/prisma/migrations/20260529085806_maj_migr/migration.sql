/*
  Warnings:

  - You are about to drop the column `deletedAt` on the `candidat` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "candidat" DROP COLUMN "deletedAt",
ADD COLUMN     "delete_at" TIMESTAMP(3);
