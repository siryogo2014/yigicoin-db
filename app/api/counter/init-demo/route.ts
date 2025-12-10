import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Endpoint de laboratorio para iniciar un contador demo corto.
 * Uso:
 *  POST /api/counter/init-demo?email=...&seconds=60
 *
 * Solo ajusta:
 * - counterExpiresAt
 * - isSuspended
 */
export async function POST(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const email = searchParams.get('email');
        const secondsParam = searchParams.get('seconds');

        if (!email) {
            return NextResponse.json(
                { ok: false, error: 'MISSING_EMAIL', message: 'Missing ?email=' },
                { status: 400 }
            );
        }

        const user = await prisma.user.findUnique({
            where: { email },
            select: { id: true, email: true, counterExpiresAt: true, isSuspended: true },
        });

        if (!user) {
            return NextResponse.json(
                { ok: false, error: 'USER_NOT_FOUND' },
                { status: 404 }
            );
        }

        const seconds = secondsParam ? Number(secondsParam) : 60;
        if (!Number.isFinite(seconds) || seconds <= 0) {
            return NextResponse.json(
                { ok: false, error: 'INVALID_SECONDS' },
                { status: 400 }
            );
        }

        const now = new Date();
        const expiresAt = new Date(now.getTime() + seconds * 1000);

        const updated = await prisma.user.update({
            where: { id: user.id },
            data: {
                counterExpiresAt: expiresAt,
                isSuspended: false,
                // NO agregues counterStartedAt porque NO existe en schema 1.7
            },
            select: {
                id: true,
                email: true,
                counterExpiresAt: true,
                isSuspended: true,
            },
        });

        return NextResponse.json({
            ok: true,
            user: updated,
        });
    } catch (err) {
        console.error('[counter/init-demo] error', err);
        return NextResponse.json(
            { ok: false, error: 'SERVER_ERROR' },
            { status: 500 }
        );
    }
}
