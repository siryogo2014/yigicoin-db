-- AlterEnum
ALTER TYPE "SlotOwnerType" ADD VALUE 'VACANT';

-- DropIndex
DROP INDEX "Slot_label_key";

-- DropIndex
DROP INDEX "Slot_level_position_idx";

-- CreateTable
CREATE TABLE "SlotTransferLog" (
    "id" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,
    "slotLabel" TEXT,
    "fromOwnerType" "SlotOwnerType" NOT NULL,
    "fromOwnerUserId" TEXT,
    "toOwnerType" "SlotOwnerType" NOT NULL,
    "toOwnerUserId" TEXT,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SlotTransferLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SlotTransferLog_slotId_idx" ON "SlotTransferLog"("slotId");

-- CreateIndex
CREATE INDEX "SlotTransferLog_fromOwnerUserId_idx" ON "SlotTransferLog"("fromOwnerUserId");

-- CreateIndex
CREATE INDEX "SlotTransferLog_toOwnerUserId_idx" ON "SlotTransferLog"("toOwnerUserId");

-- CreateIndex
CREATE INDEX "Slot_ownerType_idx" ON "Slot"("ownerType");

-- CreateIndex
CREATE INDEX "Slot_ownerUserId_idx" ON "Slot"("ownerUserId");

-- AddForeignKey
ALTER TABLE "SlotTransferLog" ADD CONSTRAINT "SlotTransferLog_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "Slot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
