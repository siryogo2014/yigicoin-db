-- CreateEnum
CREATE TYPE "UserRank" AS ENUM ('registrado', 'invitado', 'miembro', 'vip', 'premium', 'elite');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('totem_used', 'suspended_for_counter', 'purchase_success', 'purchase_failed');

-- CreateEnum
CREATE TYPE "DrawType" AS ENUM ('raffle_weekly', 'raffle_monthly', 'lottery_weekly', 'lottery_monthly', 'lottery_vip_weekly', 'lottery_vip_monthly');

-- CreateEnum
CREATE TYPE "DrawStatus" AS ENUM ('pending', 'active', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "TicketPaymentType" AS ENUM ('points', 'metamask');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('pending', 'paid', 'winner', 'loser');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "name" TEXT,
    "rank" "UserRank" NOT NULL DEFAULT 'registrado',
    "points" INTEGER NOT NULL DEFAULT 0,
    "totems" INTEGER NOT NULL DEFAULT 0,
    "isSuspended" BOOLEAN NOT NULL DEFAULT false,
    "suspendedAt" TIMESTAMP(3),
    "counterExpiresAt" TIMESTAMP(3),
    "lastTotemUsedAt" TIMESTAMP(3),
    "isOwner" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdClaim" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "adId" TEXT NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 2,
    "claimedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date" TEXT NOT NULL,

    CONSTRAINT "AdClaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Draw" (
    "id" TEXT NOT NULL,
    "type" "DrawType" NOT NULL,
    "status" "DrawStatus" NOT NULL DEFAULT 'active',
    "prizeAmount" INTEGER NOT NULL,
    "accumulatedPrize" INTEGER NOT NULL DEFAULT 0,
    "drawDate" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "winnerId" TEXT,
    "winnerTicketId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Draw_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ticket" (
    "id" TEXT NOT NULL,
    "drawId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ticketNumber" TEXT NOT NULL,
    "paymentType" "TicketPaymentType" NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'pending',
    "pointsCost" INTEGER,
    "usdCost" INTEGER,
    "txHash" TEXT,
    "purchasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DrawResult" (
    "id" TEXT NOT NULL,
    "drawId" TEXT NOT NULL,
    "winnerId" TEXT,
    "winnerTicketId" TEXT,
    "prizeAwarded" INTEGER NOT NULL,
    "totalTickets" INTEGER NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DrawResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "News" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "authorId" TEXT NOT NULL,

    CONSTRAINT "News_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_type_idx" ON "Notification"("type");

-- CreateIndex
CREATE INDEX "AdClaim_userId_date_idx" ON "AdClaim"("userId", "date");

-- CreateIndex
CREATE INDEX "AdClaim_adId_date_idx" ON "AdClaim"("adId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "AdClaim_userId_adId_date_key" ON "AdClaim"("userId", "adId", "date");

-- CreateIndex
CREATE INDEX "Draw_type_status_idx" ON "Draw"("type", "status");

-- CreateIndex
CREATE INDEX "Draw_drawDate_idx" ON "Draw"("drawDate");

-- CreateIndex
CREATE INDEX "Draw_winnerId_idx" ON "Draw"("winnerId");

-- CreateIndex
CREATE INDEX "Ticket_userId_idx" ON "Ticket"("userId");

-- CreateIndex
CREATE INDEX "Ticket_drawId_idx" ON "Ticket"("drawId");

-- CreateIndex
CREATE INDEX "Ticket_status_idx" ON "Ticket"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_drawId_ticketNumber_key" ON "Ticket"("drawId", "ticketNumber");

-- CreateIndex
CREATE UNIQUE INDEX "DrawResult_drawId_key" ON "DrawResult"("drawId");

-- CreateIndex
CREATE INDEX "DrawResult_winnerId_idx" ON "DrawResult"("winnerId");

-- CreateIndex
CREATE INDEX "DrawResult_completedAt_idx" ON "DrawResult"("completedAt");

-- CreateIndex
CREATE INDEX "News_isActive_createdAt_idx" ON "News"("isActive", "createdAt");

-- CreateIndex
CREATE INDEX "News_authorId_idx" ON "News"("authorId");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_drawId_fkey" FOREIGN KEY ("drawId") REFERENCES "Draw"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrawResult" ADD CONSTRAINT "DrawResult_drawId_fkey" FOREIGN KEY ("drawId") REFERENCES "Draw"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "News" ADD CONSTRAINT "News_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
