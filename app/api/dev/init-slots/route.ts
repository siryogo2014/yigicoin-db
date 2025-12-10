import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isDevMode } from '@/lib/devMode';

export const dynamic = 'force-dynamic';

type BaseSlotDef = {
    label: string;
    level: number;
    position: number;
    parentLabel: string | null;
};

/**
 * Árbol base LAB (18 slots):
 * P_ROOT
 * A, B
 * C, D, E, F
 * G, H, I, K, M, N, O
 * P, Q, R, S
 *
 * position sigue el orden BFS 0..17 usado en tus pruebas previas.
 */
const BASE_SLOTS: BaseSlotDef[] = [
    { label: 'P_ROOT', level: 0, position: 0, parentLabel: null },

    { label: 'A', level: 1, position: 1, parentLabel: 'P_ROOT' },
    { label: 'B', level: 1, position: 2, parentLabel: 'P_ROOT' },

    { label: 'C', level: 2, position: 3, parentLabel: 'A' },
    { label: 'D', level: 2, position: 4, parentLabel: 'A' },
    { label: 'E', level: 2, position: 5, parentLabel: 'B' },
    { label: 'F', level: 2, position: 6, parentLabel: 'B' },

    { label: 'G', level: 3, position: 7, parentLabel: 'C' },
    { label: 'H', level: 3, position: 8, parentLabel: 'C' },
    { label: 'I', level: 3, position: 9, parentLabel: 'D' },
    { label: 'K', level: 3, position: 10, parentLabel: 'D' },
    { label: 'M', level: 3, position: 11, parentLabel: 'E' },
    { label: 'N', level: 3, position: 12, parentLabel: 'E' },
    { label: 'O', level: 3, position: 13, parentLabel: 'F' },

    // Nivel 4 simplificado para LAB
    { label: 'P', level: 4, position: 14, parentLabel: 'G' },
    { label: 'Q', level: 4, position: 15, parentLabel: 'H' },
    { label: 'R', level: 4, position: 16, parentLabel: 'I' },
    { label: 'S', level: 4, position: 17, parentLabel: 'K' },
];

export async function POST(_req: NextRequest) {
    if (!isDevMode()) {
        return NextResponse.json(
            { ok: false, code: 'DEV_ENDPOINT_DISABLED' },
            { status: 404 },
        );
    }

    // Si ya existe raíz, consideramos inicializado.
    const existingRoot = await prisma.slot.findFirst({
        where: { parentId: null },
        orderBy: [{ level: 'asc' }, { position: 'asc' }],
    });

    if (existingRoot) {
        const count = await prisma.slot.count();
        return NextResponse.json({
            ok: true,
            alreadyInitialized: true,
            count,
        });
    }

    const created = await prisma.$transaction(async (tx) => {
        const labelToId = new Map<string, string>();

        // Crear raíz primero
        const rootDef = BASE_SLOTS.find((s) => s.label === 'P_ROOT');
        if (!rootDef) {
            throw new Error('BASE_SLOTS missing P_ROOT');
        }

        const root = await tx.slot.create({
            data: {
                label: rootDef.label,
                level: rootDef.level,
                position: rootDef.position,
                parentId: null,
                ownerType: 'PLATFORM',
                ownerUserId: null,
            },
        });
        labelToId.set(root.label ?? 'P_ROOT', root.id);
        labelToId.set('P_ROOT', root.id);

        // Crear el resto en orden
        const rest = BASE_SLOTS.filter((s) => s.label !== 'P_ROOT');

        for (const def of rest) {
            const parentId = def.parentLabel
                ? labelToId.get(def.parentLabel) ?? null
                : null;

            const slot = await tx.slot.create({
                data: {
                    label: def.label,
                    level: def.level,
                    position: def.position,
                    parentId,
                    ownerType: 'PLATFORM',
                    ownerUserId: null,
                },
            });

            labelToId.set(def.label, slot.id);
        }

        return rest.length + 1;
    });

    const count = await prisma.slot.count();

    return NextResponse.json({
        ok: true,
        alreadyInitialized: false,
        created: created,
        count,
    });
}
