// lib/slotTreeIntegrity.ts
import { prisma } from '@/lib/prisma';
import type { Slot } from '@prisma/client';

export type SlotTreeIssueType =
    | 'TOO_MANY_CHILDREN'
    | 'MISSING_PARENT';

export type SlotTreeIssue = {
    type: SlotTreeIssueType;
    parentId: string | null;
    parentLabel: string | null;
    childrenCount?: number;
    message: string;
};

export type SlotTreeIntegrityResult = {
    ok: boolean;
    totalSlots: number;
    maxChildrenPerParent: number;
    issues: SlotTreeIssue[];
};

/**
 * Reglas de M10:
 * - Ningún slot puede tener más de 2 hijos (a nivel de tabla Slot).
 * - Ningún slot puede referenciar un parentId inexistente.
 *
 * Nota: NO imponemos límite de raíces (parentId = null) porque
 * tu diseño puede tener más de un árbol en el futuro.
 */
export async function checkSlotTreeIntegrity(): Promise<SlotTreeIntegrityResult> {
    const slots = await prisma.slot.findMany({
        orderBy: [{ level: 'asc' }, { position: 'asc' }],
    });

    const byId = new Map<string, Slot>();
    for (const s of slots) {
        byId.set(s.id, s);
    }

    const childrenByParent = new Map<string | null, Slot[]>();
    for (const slot of slots) {
        const key = slot.parentId ?? null;
        const arr = childrenByParent.get(key) ?? [];
        arr.push(slot);
        childrenByParent.set(key, arr);
    }

    const issues: SlotTreeIssue[] = [];
    let maxChildrenPerParent = 0;

    // Regla 1: máximo 2 hijos por parentId (solo parentId != null)
    for (const [parentId, children] of childrenByParent.entries()) {
        if (parentId === null) continue; // raíces: no limitamos aquí

        const count = children.length;
        if (count > maxChildrenPerParent) {
            maxChildrenPerParent = count;
        }

        if (count > 2) {
            const parent = byId.get(parentId);
            issues.push({
                type: 'TOO_MANY_CHILDREN',
                parentId,
                parentLabel: parent?.label ?? null,
                childrenCount: count,
                message: `Slot ${parent?.label ?? parentId} tiene ${count} hijos (máximo permitido: 2).`,
            });
        }
    }

    // Regla 2: parentId debe existir si no es null
    for (const slot of slots) {
        if (slot.parentId && !byId.has(slot.parentId)) {
            issues.push({
                type: 'MISSING_PARENT',
                parentId: slot.parentId,
                parentLabel: null,
                message: `Slot ${slot.label ?? slot.id} referencia un parentId inexistente (${slot.parentId}).`,
            });
        }
    }

    // Si nunca hubo ningún parent con hijos, maxChildrenPerParent se queda en 0.
    // Para que tenga sentido, calculamos el máximo real si no se tocó.
    if (maxChildrenPerParent === 0) {
        for (const [parentId, children] of childrenByParent.entries()) {
            if (parentId === null) continue;
            if (children.length > maxChildrenPerParent) {
                maxChildrenPerParent = children.length;
            }
        }
    }

    return {
        ok: issues.length === 0,
        totalSlots: slots.length,
        maxChildrenPerParent,
        issues,
    };
}
