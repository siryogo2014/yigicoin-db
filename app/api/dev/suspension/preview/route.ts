// app/api/dev/suspension/preview/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { isDevMode } from '@/lib/devMode';
import type { UserRank } from '@prisma/client';
import { getSuspensionRule } from '@/lib/suspensionRules';

const ALLOWED_RANKS: UserRank[] = [
    'registrado',
    'invitado',
    'miembro',
    'vip',
    'premium',
    'elite',
];

type PreviewBody = {
    rank?: string;
};

/**
 * DEV ONLY:
 * Devuelve la regla de suspensión/multa para un rango dado.
 *
 * Ejemplo:
 * POST /api/dev/suspension/preview
 * { "rank": "vip" }
 */
export async function POST(req: NextRequest) {
    if (!isDevMode()) {
        return NextResponse.json(
            { ok: false, code: 'DEV_ENDPOINT_DISABLED' },
            { status: 404 },
        );
    }

    let body: PreviewBody | null = null;
    try {
        body = (await req.json()) as PreviewBody;
    } catch {
        body = null;
    }

    const rankRaw = body?.rank?.toString().toLowerCase().trim();

    let rank: UserRank = 'registrado';
    if (
        rankRaw &&
        (ALLOWED_RANKS as string[]).includes(rankRaw)
    ) {
        rank = rankRaw as UserRank;
    }

    const rule = getSuspensionRule(rank);

    return NextResponse.json({
        ok: true,
        rank,
        rule,
    });
}
