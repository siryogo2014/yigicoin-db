import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isDevMode } from '@/lib/devMode';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    if (!isDevMode()) {
        return NextResponse.json(
            { ok: false, code: 'DEV_ENDPOINT_DISABLED' },
            { status: 404 },
        );
    }

    const email = req.nextUrl.searchParams.get('email');
    const amountRaw = req.nextUrl.searchParams.get('amount');

    const amount = amountRaw ? Number(amountRaw) : NaN;

    if (!email || Number.isNaN(amount)) {
        return NextResponse.json(
            { ok: false, error: 'EMAIL_AND_AMOUNT_REQUIRED' },
            { status: 400 },
        );
    }

    const user = await prisma.user.findUnique({
        where: { email },
        select: { id: true, points: true },
    });

    if (!user) {
        return NextResponse.json(
            { ok: false, error: 'USER_NOT_FOUND' },
            { status: 404 },
        );
    }

    const updated = await prisma.user.update({
        where: { id: user.id },
        data: { points: Math.max(0, (user.points ?? 0) + amount) },
        select: { id: true, email: true, points: true },
    });

    return NextResponse.json({ ok: true, user: updated });
}
