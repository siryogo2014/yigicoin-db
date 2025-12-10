// lib/rankUpgrade.ts
import { prisma } from '@/lib/prisma';
import type { Rank } from './ranksConfig';
import { getUpgradeInfoForRank } from './ranksConfig';

export type UpgradeResult =
    | {
        ok: true;
        upgradedUser: {
            id: string;
            email: string;
            oldRank: Rank;
            newRank: Rank;
        };
    }
    | { ok: false; code: string; message: string };

export async function getUpgradeInfoByEmail(email: string) {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
        return {
            ok: false as const,
            code: 'USER_NOT_FOUND',
            message: 'Usuario no encontrado',
        };
    }

    const rank = user.rank as Rank;
    const info = getUpgradeInfoForRank(rank);

    if (!info) {
        return {
            ok: false as const,
            code: 'ALREADY_MAX_RANK',
            message: 'Ya tienes el rango máximo',
        };
    }

    return {
        ok: true as const,
        user,
        info,
    };
}

export async function upgradeUserRankByEmail(email: string): Promise<UpgradeResult> {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
        return { ok: false, code: 'USER_NOT_FOUND', message: 'Usuario no encontrado' };
    }

    if ((user as any).isSuspended) {
        return {
            ok: false,
            code: 'USER_SUSPENDED',
            message: 'Usuario suspendido, no puede subir rango',
        };
    }

    const currentRank = user.rank as Rank;
    const info = getUpgradeInfoForRank(currentRank);

    if (!info) {
        return {
            ok: false,
            code: 'ALREADY_MAX_RANK',
            message: 'Ya tienes el rango máximo',
        };
    }

    const updated = await prisma.user.update({
        where: { email },
        data: {
            rank: info.nextRank,
            points: {
                increment: info.bonusPoints,
            },
        },
    });

    return {
        ok: true,
        upgradedUser: {
            id: updated.id,
            email: updated.email,
            oldRank: currentRank,
            newRank: updated.rank as Rank,
        },
    };
}
