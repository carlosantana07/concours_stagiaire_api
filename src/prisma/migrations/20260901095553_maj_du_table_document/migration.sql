/*
  Warnings:

  - Added the required column `url` to the `document` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TypeDocument" ADD VALUE 'CNIB';
ALTER TYPE "TypeDocument" ADD VALUE 'PASSPORT';
ALTER TYPE "TypeDocument" ADD VALUE 'NATIONALITE';

-- AlterTable
ALTER TABLE "document" ADD COLUMN     "url" TEXT NOT NULL;
