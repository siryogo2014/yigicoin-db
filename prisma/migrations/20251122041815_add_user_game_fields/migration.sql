-- AlterTable
ALTER TABLE "User" ADD COLUMN     "counterExpiresAt" TIMESTAMP(3),
ADD COLUMN     "isSuspended" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "points" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "rank" "UserRank" NOT NULL DEFAULT 'registrado',
ADD COLUMN     "suspendedAt" TIMESTAMP(3),
ADD COLUMN     "totems" INTEGER NOT NULL DEFAULT 0;
