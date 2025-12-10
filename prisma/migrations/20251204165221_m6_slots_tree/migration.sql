-- CreateEnum
CREATE TYPE "SlotOwnerType" AS ENUM ('PLATFORM', 'USER');

-- CreateTable
CREATE TABLE "Slot" (
    "id" TEXT NOT NULL,
    "ownerType" "SlotOwnerType" NOT NULL,
    "ownerUserId" TEXT,
    "parentId" TEXT,
    "level" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Slot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Slot_label_key" ON "Slot"("label");

-- CreateIndex
CREATE INDEX "Slot_parentId_idx" ON "Slot"("parentId");

-- CreateIndex
CREATE INDEX "Slot_level_position_idx" ON "Slot"("level", "position");

-- AddForeignKey
ALTER TABLE "Slot" ADD CONSTRAINT "Slot_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Slot" ADD CONSTRAINT "Slot_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Slot"("id") ON DELETE SET NULL ON UPDATE CASCADE;
