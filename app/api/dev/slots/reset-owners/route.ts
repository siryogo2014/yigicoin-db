import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isDevMode } from '@/lib/devMode';

export const dynamic = 'force-dynamic';

export async function POST(_req: NextRequest) {
    if (!isDevMode()) {
        return NextResponse.json(
            { ok: false, code: 'DEV_ENDPOINT_DISABLED' },
            { status: 404 },
        );
    }

    // Resetea todos menos la raíz (tu script esperaba ~17)
    const res = await prisma.slot.updateMany({
        where: { label: { not: 'P_ROOT' } },
        data: { ownerType: 'PLATFORM', ownerUserId: null },
    });

    return NextResponse.json({ ok: true, resetCount: res.count });
}
