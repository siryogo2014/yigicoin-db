import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isDevMode } from '@/lib/devMode';
import { previewSponsorsForUser } from '@/lib/treeSponsors';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    if (!isDevMode()) {
        return NextResponse.json(
            { ok: false, code: 'DEV_ENDPOINT_DISABLED' },
            { status: 404 },
        );
    }

    const email = req.nextUrl.searchParams.get('email');
    if (!email) {
        return NextResponse.json(
            { ok: false, code: 'EMAIL_REQUIRED', message: 'Falta email.' },
            { status: 400 },
        );
    }

    const user = await prisma.user.findUnique({
        where: { email },
        select: { id: true, email: true, rank: true },
    });

    if (!user) {
        return NextResponse.json(
            { ok: false, code: 'USER_NOT_FOUND', message: 'Usuario no encontrado.' },
            { status: 404 },
        );
    }

    const results = await previewSponsorsForUser(user.id);

    return NextResponse.json({
        ok: true,
        user,
        results,
    });
}
