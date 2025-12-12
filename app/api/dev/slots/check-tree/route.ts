import { NextRequest, NextResponse } from 'next/server';
import { isDevMode } from '@/lib/devMode';
import { checkSlotTreeIntegrity } from '@/lib/slotTreeIntegrity';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest) {
    if (!isDevMode()) {
        return NextResponse.json(
            { ok: false, code: 'DEV_ENDPOINT_DISABLED' },
            { status: 404 },
        );
    }

    try {
        const result = await checkSlotTreeIntegrity();

        return NextResponse.json({
            ok: result.ok,
            totalSlots: result.totalSlots,
            maxChildrenPerParent: result.maxChildrenPerParent,
            issues: result.issues,
        });
    } catch (error) {
        // En DEV prefiero log visible en consola
        console.error('[DEV][slots/check-tree] error', error);

        return NextResponse.json(
            {
                ok: false,
                code: 'INTERNAL_ERROR',
                message: 'Error al verificar integridad del árbol de slots.',
            },
            { status: 500 },
        );
    }
}
