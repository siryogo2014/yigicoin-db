// app/api/payments/paypal/capture-order/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { capturePaypalOrder } from '@/lib/paypal';
import { prisma } from '@/lib/prisma';
import {
    getUpgradeInfoByEmail,
    upgradeUserRankByEmail,
} from '@/lib/rankUpgrade';
import { logRankUpgrade } from '@/lib/rankUpgradeLog';

type CaptureInfo = {
    status?: string;
    currency?: string;
    amount?: number;
};

// Extrae status / currency / amount de la respuesta de PayPal
function extractCaptureInfo(paypalOrder: any): CaptureInfo {
    if (!paypalOrder) return {};

    const purchaseUnit = paypalOrder.purchase_units?.[0];
    const capture =
        purchaseUnit?.payments?.captures?.[0] ??
        purchaseUnit?.payments?.authorizations?.[0];

    const status: string | undefined =
        capture?.status ?? paypalOrder.status ?? undefined;

    const amountObj =
        capture?.amount ??
        purchaseUnit?.amount ??
        paypalOrder.purchase_units?.[0]?.amount;

    const currency: string | undefined = amountObj?.currency_code;
    const valueStr: string | undefined = amountObj?.value;

    const amount =
        typeof valueStr === 'string' ? parseFloat(valueStr) : undefined;

    return { status, currency, amount };
}

export async function POST(req: NextRequest) {
    // 1) Leer email de query o del body
    let body: any = null;
    try {
        body = await req.json();
    } catch {
        body = null;
    }

    const emailFromQuery = req.nextUrl.searchParams.get('email');
    const emailFromBody = body?.email as string | undefined;
    const email = emailFromQuery ?? emailFromBody ?? null;

    if (!email) {
        return NextResponse.json(
            { ok: false, error: 'EMAIL_REQUIRED' },
            { status: 400 },
        );
    }

    // orderId puede venir como "orderId" o como "token"
    const token = body?.orderId ?? body?.token;
    const orderId = typeof token === 'string' ? token : null;

    if (!orderId) {
        return NextResponse.json(
            { ok: false, error: 'ORDER_ID_REQUIRED' },
            { status: 400 },
        );
    }

    // Idempotencia: si ya tenemos Payment COMPLETED con esta referencia, no repetimos
    const existingPayment = await prisma.payment.findUnique({
        where: { reference: orderId },
    });

    if (existingPayment && existingPayment.status === 'completed') {
        return NextResponse.json({
            ok: true,
            alreadyProcessed: true,
            upgrade: null,
        });
    }

    // Info de upgrade (precio esperado)
    const upgradeInfo = await getUpgradeInfoByEmail(email);
    if (!upgradeInfo.ok) {
        const status =
            upgradeInfo.code === 'USER_NOT_FOUND' ? 404 : 400;
        return NextResponse.json(
            { ok: false, error: upgradeInfo.message, code: upgradeInfo.code },
            { status },
        );
    }

    const expectedPriceUSD = upgradeInfo.info.priceUSD;

    // 2) Capturar en PayPal
    let paypalOrder: any;
    try {
        paypalOrder = await capturePaypalOrder(orderId);
    } catch (err) {
        console.error('Error capturePaypalOrder', err);
        return NextResponse.json(
            { ok: false, error: 'PAYPAL_CAPTURE_FAILED' },
            { status: 502 },
        );
    }

    const { status, currency, amount } = extractCaptureInfo(paypalOrder);

    if (status !== 'COMPLETED') {
        console.error('PayPal capture status not COMPLETED:', status);
        if (existingPayment) {
            await prisma.payment.update({
                where: { id: existingPayment.id },
                data: { status: 'failed' },
            });
        }
        return NextResponse.json(
            { ok: false, error: 'PAYPAL_STATUS_NOT_COMPLETED', paypalStatus: status },
            { status: 400 },
        );
    }

    if (currency !== 'USD') {
        console.error('PayPal currency mismatch:', currency);
        if (existingPayment) {
            await prisma.payment.update({
                where: { id: existingPayment.id },
                data: { status: 'failed' },
            });
        }
        return NextResponse.json(
            { ok: false, error: 'PAYPAL_CURRENCY_MISMATCH', currency },
            { status: 400 },
        );
    }

    if (typeof amount !== 'number' || Number.isNaN(amount)) {
        console.error('PayPal amount invalid:', amount);
        if (existingPayment) {
            await prisma.payment.update({
                where: { id: existingPayment.id },
                data: { status: 'failed' },
            });
        }
        return NextResponse.json(
            { ok: false, error: 'PAYPAL_AMOUNT_INVALID' },
            { status: 400 },
        );
    }

    const diff = Math.abs(amount - expectedPriceUSD);
    // tolerancia 0.01 USD
    if (diff > 0.01) {
        console.error(
            'PayPal amount mismatch',
            'expected',
            expectedPriceUSD,
            'actual',
            amount,
        );
        if (existingPayment) {
            await prisma.payment.update({
                where: { id: existingPayment.id },
                data: { status: 'failed' },
            });
        }
        return NextResponse.json(
            {
                ok: false,
                error: 'PAYPAL_AMOUNT_MISMATCH',
                expectedPriceUSD,
                paidAmount: amount,
            },
            { status: 400 },
        );
    }

    // 3) Crear (o reaprovechar) Payment en pending
    let payment = existingPayment;
    if (!payment) {
        const user = await prisma.user.findUnique({
            where: { email },
            select: { id: true },
        });

        if (!user) {
            return NextResponse.json(
                { ok: false, error: 'USER_NOT_FOUND' },
                { status: 404 },
            );
        }

        try {
            payment = await prisma.payment.create({
                data: {
                    email,
                    userId: user.id,
                    amount: expectedPriceUSD,
                    currency: 'USD',
                    status: 'pending',
                    method: 'paypal',
                    provider: 'paypal',
                    reference: orderId,
                    purpose: 'rank_upgrade',
                },
            });
        } catch (err) {
            console.error('Error creando Payment (paypal)', err);
            return NextResponse.json(
                { ok: false, error: 'PAYMENT_RECORD_FAILED' },
                { status: 500 },
            );
        }
    }

    // 4) Aplicar upgrade
    const upgradeResult = await upgradeUserRankByEmail(email);

    if (!upgradeResult.ok) {
        try {
            await prisma.payment.update({
                where: { id: payment.id },
                data: { status: 'failed' },
            });
        } catch (err) {
            console.error('Error marcando Payment como failed (paypal)', err);
        }

        const status =
            upgradeResult.code === 'USER_NOT_FOUND' ? 404 : 400;

        return NextResponse.json(
            { ok: false, error: upgradeResult.message, code: upgradeResult.code },
            { status },
        );
    }

    // 5) Marcar completed + log
    try {
        await prisma.payment.update({
            where: { id: payment.id },
            data: {
                status: 'completed',
                amount,
                currency: 'USD',
            },
        });

        await logRankUpgrade({
            userId: upgradeResult.upgradedUser.id,
            fromRank: upgradeResult.upgradedUser.oldRank,
            toRank: upgradeResult.upgradedUser.newRank,
            provider: 'paypal',
            paymentId: payment.id,
        });
    } catch (err) {
        console.error('Error actualizando Payment / RankUpgradeLog (paypal)', err);
    }

    return NextResponse.json({
        ok: true,
        orderId,
        paypalStatus: status,
        upgrade: upgradeResult.upgradedUser,
    });
}
