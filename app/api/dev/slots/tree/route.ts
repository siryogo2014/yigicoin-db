import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isDevMode } from '@/lib/devMode';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    if (!isDevMode()) {
        return NextResponse.json(
            { ok: false, code: 'DEV_ENDPOINT_DISABLED' },
            { status: 404 },
        );
    }

    const maxLevelRaw = req.nextUrl.searchParams.get('maxLevel');

    let where: any = {};
    if (maxLevelRaw !== null) {
        const parsed = Number.parseInt(maxLevelRaw, 10);
        if (!Number.isNaN(parsed) && parsed >= 0) {
            where = { level: { lte: parsed } };
        }
    }

    const slots = await prisma.slot.findMany({
        where,
        orderBy: [{ level: 'asc' }, { position: 'asc' }],
        include: {
            ownerUser: {
                select: { id: true, email: true, rank: true },
            },
        },
    });

    return NextResponse.json({ ok: true, slots });
}
