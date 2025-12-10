// lib/rankUpgradeLog.ts
import { prisma } from '@/lib/prisma';
import type { UserRank } from '@prisma/client';

export async function logRankUpgrade(params: {
    userId: string;
    fromRank: UserRank | string;
    toRank: UserRank | string;
    provider: string;
    paymentId?: string | null;
}) {
    const { userId, fromRank, toRank, provider, paymentId } = params;

    return prisma.rankUpgradeLog.create({
        data: {
            userId,
            fromRank: fromRank as UserRank,
            toRank: toRank as UserRank,
            provider,
            paymentId: paymentId ?? null,
        },
    });
}
