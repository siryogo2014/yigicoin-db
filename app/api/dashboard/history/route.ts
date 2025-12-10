// app/api/dashboard/history/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
    const email = req.nextUrl.searchParams.get('email');

    if (!email) {
        return NextResponse.json(
            { ok: false, error: 'EMAIL_REQUIRED' },
            { status: 400 },
        );
    }

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

    const [payments, upgrades] = await Promise.all([
        prisma.payment.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: 'desc' },
            take: 10,
            select: {
                id: true,
                createdAt: true,
                amount: true,
                currency: true,
                status: true,
                method: true,
                provider: true,
                purpose: true,
                reference: true,
            },
        }),
        prisma.rankUpgradeLog.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: 'desc' },
            take: 10,
            select: {
                id: true,
                createdAt: true,
                fromRank: true,
                toRank: true,
                provider: true,
                paymentId: true,
            },
        }),
    ]);

    return NextResponse.json({
        ok: true,
        payments,
        upgrades,
    });
}
