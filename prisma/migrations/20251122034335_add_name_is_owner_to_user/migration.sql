-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isOwner" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "name" TEXT;
