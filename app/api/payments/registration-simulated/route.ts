// app/api/payments/registration-simulated/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isDevMode } from '@/lib/devMode';

export async function POST(req: NextRequest) {
    if (!isDevMode()) {
        return NextResponse.json(
            { ok: false, code: 'DEV_ENDPOINT_DISABLED' },
            { status: 404 },
        );
    }

    try {
        const body = await req.json().catch(() => null);
        const email = body?.email?.toString().toLowerCase().trim();

        if (!email) {
            return NextResponse.json(
                { ok: false, code: 'EMAIL_REQUIRED' },
                { status: 400 },
            );
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return NextResponse.json(
                { ok: false, code: 'USER_NOT_FOUND' },
                { status: 404 },
            );
        }

        const payment = await prisma.payment.create({
            data: {
                userId: user.id,
                email,
                amount: 3,
                currency: 'USD',
                status: 'completed',
                method: 'paypal_simulated',
                provider: 'simulated',
                purpose: 'registration_fee',
            },
        });

        return NextResponse.json({ ok: true, payment });
    } catch (err: any) {
        return NextResponse.json(
            {
                ok: false,
                code: 'SIM_REGISTRATION_FAILED',
                message: err?.message ?? 'Unknown error',
            },
            { status: 500 },
        );
    }
}
