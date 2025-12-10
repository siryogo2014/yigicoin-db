// app/api/payments/paypal/create-order/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getUpgradeInfoByEmail } from '@/lib/rankUpgrade';
import { createPaypalOrder } from '@/lib/paypal';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
    const email = req.nextUrl.searchParams.get('email');

    if (!email) {
        return NextResponse.json({ error: 'EMAIL_REQUIRED' }, { status: 400 });
    }

    const origin = new URL(req.url).origin;

    const info = await getUpgradeInfoByEmail(email);
    if (!info.ok) {
        return NextResponse.json(
            { error: info.message, code: info.code },
            { status: 400 },
        );
    }

    const amountUSD = info.info.priceUSD;
    const amount = amountUSD.toFixed(2);
    const amountCents = Math.round(amountUSD * 100);

    const description = `Upgrade de ${info.user.rank} a ${info.info.nextRank} para ${email}`;

    try {
        const order = await createPaypalOrder({
            amount,
            currency: 'USD',
            description,
            returnUrl: `${origin}/paypal/return?email=${encodeURIComponent(email)}`,
            cancelUrl: `${origin}/paypal/cancel?email=${encodeURIComponent(email)}`,
        });

        const approveUrl =
            order.links?.find((l: any) => l.rel === 'approve')?.href ?? null;

        // Registrar el intento de pago como "pending"
        try {
            await prisma.payment.create({
                data: {
                    email,
                    amount: amountCents,
                    currency: 'USD',
                    status: 'pending',
                    method: 'paypal',
                    provider: 'paypal',
                    reference: order.id,
                    purpose: 'rank_upgrade',
                },
            });
        } catch (err) {
            // No rompas el flujo del usuario solo por fallar el log
            console.error('Error creando Payment (create-order)', err);
        }

        return NextResponse.json({
            ok: true,
            orderId: order.id,
            status: order.status,
            approveUrl,
        });
    } catch (err: any) {
        console.error('create-order error', err);
        return NextResponse.json(
            { error: 'PAYPAL_CREATE_ORDER_FAILED' },
            { status: 500 },
        );
    }
}
