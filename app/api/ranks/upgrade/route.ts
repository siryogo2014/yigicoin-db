// app/api/ranks/upgrade/route.ts
import { NextRequest, NextResponse } from 'next/server';
import {
    upgradeUserRankByEmail,
    getUpgradeInfoByEmail,
} from '@/lib/rankUpgrade';
import { logRankUpgrade } from '@/lib/rankUpgradeLog';

export async function GET(req: NextRequest) {
    const email = req.nextUrl.searchParams.get('email');

    if (!email) {
        return NextResponse.json({ error: 'EMAIL_REQUIRED' }, { status: 400 });
    }

    const info = await getUpgradeInfoByEmail(email);

    if (!info.ok) {
        return NextResponse.json(
            { error: info.message, code: info.code },
            { status: 400 },
        );
    }

    return NextResponse.json({
        ok: true,
        email,
        currentRank: info.user.rank,
        nextRank: info.info.nextRank,
        priceUSD: info.info.priceUSD,
        bonusPoints: info.info.bonusPoints,
    });
}

export async function POST(req: NextRequest) {
    const email = req.nextUrl.searchParams.get('email');

    if (!email) {
        return NextResponse.json({ error: 'EMAIL_REQUIRED' }, { status: 400 });
    }

    const result = await upgradeUserRankByEmail(email);

    if (!result.ok) {
        const status = result.code === 'USER_NOT_FOUND' ? 404 : 400;
        return NextResponse.json(
            { error: result.message, code: result.code },
            { status },
        );
    }

    // Upgrade DEV sin pago: también lo dejamos trazado
    try {
        await logRankUpgrade({
            userId: result.upgradedUser.id,
            fromRank: result.upgradedUser.oldRank,
            toRank: result.upgradedUser.newRank,
            provider: 'dev',
        });
    } catch (err) {
        console.error('Error registrando RankUpgradeLog (dev)', err);
    }

    return NextResponse.json({
        ok: true,
        email: result.upgradedUser.email,
        oldRank: result.upgradedUser.oldRank,
        newRank: result.upgradedUser.newRank,
    });
}
