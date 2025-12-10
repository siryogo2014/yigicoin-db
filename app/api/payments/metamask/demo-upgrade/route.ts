// app/api/payments/metamask/demo-upgrade/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUpgradeInfoByEmail } from '@/lib/rankUpgrade';
import { isDevMode } from '@/lib/devMode';

export async function POST(req: NextRequest) {
    if (!isDevMode()) {
        return NextResponse.json(
            { ok: false, code: 'DEV_ENDPOINT_DISABLED' },
            { status: 404 },
        );
    }

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

    // Demo: registrar pago simulado de Metamask upgrade
    const payment = await prisma.payment.create({
        data: {
            userId: info.user.id,
            email,
            amount: Math.round(info.info.priceUSD),
            currency: 'USD',
            status: 'completed',
            method: 'metamask_demo',
            provider: 'metamask',
            purpose: 'rank_upgrade',
        },
    });

    return NextResponse.json({
        ok: true,
        payment,
        upgrade: {
            from: info.user.rank,
            to: info.info.nextRank,
            priceUSD: info.info.priceUSD,
        },
    });
}
