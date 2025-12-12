-- CreateEnum
CREATE TYPE "AccountSanctionStatus" AS ENUM ('PENDING', 'PAID', 'EXPIRED', 'WAIVED');

-- CreateEnum
CREATE TYPE "AccountSanctionReason" AS ENUM ('EXPROPRIATION', 'MANUAL');

-- CreateTable
CREATE TABLE "AccountSanction" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "slotId" TEXT,
    "rankAtExpropriation" "UserRank" NOT NULL,
    "fineUSD" INTEGER NOT NULL,
    "graceHours" INTEGER NOT NULL,
    "deadlineAt" TIMESTAMP(3),
    "status" "AccountSanctionStatus" NOT NULL DEFAULT 'PENDING',
    "reason" "AccountSanctionReason" NOT NULL,

    CONSTRAINT "AccountSanction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AccountSanction_userId_idx" ON "AccountSanction"("userId");

-- CreateIndex
CREATE INDEX "AccountSanction_slotId_idx" ON "AccountSanction"("slotId");

-- CreateIndex
CREATE INDEX "AccountSanction_status_idx" ON "AccountSanction"("status");

-- AddForeignKey
ALTER TABLE "AccountSanction" ADD CONSTRAINT "AccountSanction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountSanction" ADD CONSTRAINT "AccountSanction_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "Slot"("id") ON DELETE SET NULL ON UPDATE CASCADE;
