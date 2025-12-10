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

    let body: any = null;
    try {
        body = await req.json();
    } catch {
        // ignore
    }

    const email = body?.email as string | undefined;
    const slotLabel = body?.slotLabel as string | undefined;

    if (!email || !slotLabel) {
        return NextResponse.json(
            { ok: false, error: 'EMAIL_AND_SLOT_REQUIRED' },
            { status: 400 },
        );
    }

    if (slotLabel === 'P_ROOT') {
        return NextResponse.json(
            { ok: false, error: 'CANNOT_ASSIGN_ROOT' },
            { status: 400 },
        );
    }

    const user = await prisma.user.findUnique({
        where: { email },
        select: { id: true, email: true, rank: true },
    });

    if (!user) {
        return NextResponse.json(
            { ok: false, error: 'USER_NOT_FOUND' },
            { status: 404 },
        );
    }

    const slot = await prisma.slot.findFirst({
        where: { label: slotLabel },
    });

    if (!slot) {
        return NextResponse.json(
            { ok: false, error: 'SLOT_NOT_FOUND' },
            { status: 404 },
        );
    }

    // Si ya está ocupado por USER, conflicto
    if (slot.ownerType === 'USER' && slot.ownerUserId) {
        return NextResponse.json(
            { ok: false, error: 'SLOT_ALREADY_OWNED' },
            { status: 409 },
        );
    }

    const updated = await prisma.slot.update({
        where: { id: slot.id },
        data: {
            ownerType: 'USER',
            ownerUserId: user.id,
        },
    });

    return NextResponse.json({ ok: true, slot: updated });
}
