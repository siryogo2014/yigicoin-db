// app/api/payments/metamask/onchain-upgrade/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
    getUpgradeInfoByEmail,
    upgradeUserRankByEmail,
} from '@/lib/rankUpgrade';
import { getTransactionInfo, WEB3_CONFIG } from '@/lib/web3';
import { logRankUpgrade } from '@/lib/rankUpgradeLog';
import { METAMASK_MIN_WEI_BY_NEXT_RANK } from '@/lib/rankPaymentConfig';

export async function POST(req: NextRequest) {
    const email = req.nextUrl.searchParams.get('email');

    if (!email) {
        return NextResponse.json(
            { ok: false, error: 'EMAIL_REQUIRED' },
            { status: 400 },
        );
    }

    let body: any = null;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json(
            { ok: false, error: 'INVALID_JSON_BODY' },
            { status: 400 },
        );
    }

    const { txHash } = body ?? {};
    if (!txHash || typeof txHash !== 'string') {
        return NextResponse.json(
            { ok: false, error: 'TX_HASH_REQUIRED' },
            { status: 400 },
        );
    }

    if (!WEB3_CONFIG.rpcUrl || !WEB3_CONFIG.platformAddress) {
        console.error('WEB3 config missing', WEB3_CONFIG);
        return NextResponse.json(
            { ok: false, error: 'WEB3_NOT_CONFIGURED' },
            { status: 500 },
        );
    }

    // 1) Usuario y wallet
    const user = await prisma.user.findUnique({
        where: { email },
        select: {
            id: true,
            email: true,
            walletAddress: true,
            rank: true,
            isSuspended: true,
        },
    });

    if (!user) {
        return NextResponse.json(
            { ok: false, error: 'USER_NOT_FOUND' },
            { status: 404 },
        );
    }

    if (!user.walletAddress) {
        return NextResponse.json(
            { ok: false, error: 'USER_HAS_NO_WALLET' },
            { status: 400 },
        );
    }

    if (user.isSuspended) {
        return NextResponse.json(
            { ok: false, error: 'USER_SUSPENDED' },
            { status: 400 },
        );
    }

    const walletLower = user.walletAddress.toLowerCase();

    // 2) Info de upgrade (para tener contexto y precio)
    const upgradeInfo = await getUpgradeInfoByEmail(email);
    if (!upgradeInfo.ok) {
        return NextResponse.json(
            { ok: false, error: upgradeInfo.message, code: upgradeInfo.code },
            { status: 400 },
        );
    }

    // 3) Buscar tx on-chain
    let txInfo;
    try {
        txInfo = await getTransactionInfo(txHash);
    } catch (err: any) {
        console.error('Error getTransactionInfo', err);
        return NextResponse.json(
            { ok: false, error: 'TX_LOOKUP_FAILED' },
            { status: 400 },
        );
    }

    // 4) Validar tx base
    if (txInfo.status !== 'success') {
        return NextResponse.json(
            { ok: false, error: 'TX_NOT_SUCCESS', status: txInfo.status },
            { status: 400 },
        );
    }

    if (!txInfo.to || txInfo.to !== WEB3_CONFIG.platformAddress) {
        return NextResponse.json(
            { ok: false, error: 'TX_INVALID_TO_ADDRESS' },
            { status: 400 },
        );
    }

    if (txInfo.from !== walletLower) {
        return NextResponse.json(
            { ok: false, error: 'TX_FROM_NOT_MATCH_WALLET' },
            { status: 400 },
        );
    }

    if (WEB3_CONFIG.minWei > BigInt(0) && txInfo.value < WEB3_CONFIG.minWei) {
        return NextResponse.json(
            { ok: false, error: 'TX_VALUE_BELOW_GLOBAL_MIN' },
            { status: 400 },
        );
    }

    // 4bis) Validar mínimo por rango
    const nextRank = upgradeInfo.info.nextRank;
    const configuredMinWeiStr = METAMASK_MIN_WEI_BY_NEXT_RANK[nextRank];

    if (configuredMinWeiStr) {
        const minWeiForRank = BigInt(configuredMinWeiStr);
        if (txInfo.value < minWeiForRank) {
            return NextResponse.json(
                {
                    ok: false,
                    error: 'TX_VALUE_TOO_LOW_FOR_RANK',
                    nextRank,
                    expectedMinWei: configuredMinWeiStr,
                    actualWei: txInfo.value.toString(),
                },
                { status: 400 },
            );
        }
    }

    // 5) Registrar Payment en pending
    let payment;
    try {
        payment = await prisma.payment.create({
            data: {
                email,
                userId: user.id,
                amount: 0, // si quieres, luego calculas según el valor de la tx
                currency: 'USD',
                status: 'pending',
                method: 'metamask_onchain',
                provider: 'metamask',
                reference: txHash,
                purpose: 'rank_upgrade',
            },
        });
    } catch (err) {
        console.error('Error creando Payment (metamask onchain)', err);
        return NextResponse.json(
            { ok: false, error: 'PAYMENT_RECORD_FAILED' },
            { status: 500 },
        );
    }

    // 6) Aplicar upgrade
    const result = await upgradeUserRankByEmail(email);

    if (!result.ok) {
        try {
            await prisma.payment.update({
                where: { id: payment.id },
                data: { status: 'failed' },
            });
        } catch (err) {
            console.error('Error marcando Payment como failed (onchain)', err);
        }

        const status =
            result.code === 'USER_NOT_FOUND' ? 404 : 400;

        return NextResponse.json(
            { ok: false, error: result.message, code: result.code },
            { status },
        );
    }

    // 7) Marcar pago como completado + log de upgrade
    try {
        await prisma.payment.update({
            where: { id: payment.id },
            data: { status: 'completed' },
        });

        await logRankUpgrade({
            userId: result.upgradedUser.id,
            fromRank: result.upgradedUser.oldRank,
            toRank: result.upgradedUser.newRank,
            provider: 'metamask_onchain',
            paymentId: payment.id,
        });
    } catch (err) {
        console.error(
            'Error actualizando Payment / RankUpgradeLog (metamask_onchain)',
            err,
        );
    }

    return NextResponse.json({
        ok: true,
        email: result.upgradedUser.email,
        oldRank: result.upgradedUser.oldRank,
        newRank: result.upgradedUser.newRank,
        txHash,
    });
}
