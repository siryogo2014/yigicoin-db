import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isDevMode } from '@/lib/devMode';

export async function POST(_req: NextRequest) {
    if (!isDevMode()) {
        return NextResponse.json(
            { ok: false, error: 'DEV_MODE_DISABLED' },
            { status: 403 },
        );
    }

    const result = await prisma.accountSanction.deleteMany({});

    return NextResponse.json({
        ok: true,
        deleted: result.count,
    });
}
