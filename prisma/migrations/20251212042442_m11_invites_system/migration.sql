/*
  Warnings:

  - A unique constraint covering the columns `[label]` on the table `Slot` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[level,position]` on the table `Slot` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('ACTIVE', 'CONSUMED', 'EXPIRED');

-- CreateTable
CREATE TABLE "InviteLink" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "consumedByUserId" TEXT,
    "status" "InviteStatus" NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3),
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InviteLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InviteLink_code_key" ON "InviteLink"("code");

-- CreateIndex
CREATE INDEX "InviteLink_ownerUserId_idx" ON "InviteLink"("ownerUserId");

-- CreateIndex
CREATE INDEX "InviteLink_status_expiresAt_idx" ON "InviteLink"("status", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Slot_label_key" ON "Slot"("label");

-- CreateIndex
CREATE UNIQUE INDEX "Slot_level_position_key" ON "Slot"("level", "position");

-- AddForeignKey
ALTER TABLE "InviteLink" ADD CONSTRAINT "InviteLink_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InviteLink" ADD CONSTRAINT "InviteLink_consumedByUserId_fkey" FOREIGN KEY ("consumedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
