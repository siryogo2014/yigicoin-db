// app/api/dev/invites/reset/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { devOnlyResponse } from '@/lib/devGuard';

export const dynamic = 'force-dynamic';

// POST /api/dev/invites/reset
// Elimina todas las InviteLink para pruebas de laboratorio.
export async function POST(req: NextRequest) {
    const guard = devOnlyResponse();
    if (guard) return guard;

    const deleted = await prisma.inviteLink.deleteMany({});

    return NextResponse.json({
        ok: true,
        deleted: deleted.count,
    });
}
