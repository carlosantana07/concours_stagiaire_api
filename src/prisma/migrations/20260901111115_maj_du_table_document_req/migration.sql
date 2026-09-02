/*
  Warnings:

  - Added the required column `req_id` to the `document` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "document" ADD COLUMN     "req_id" TEXT NOT NULL;
