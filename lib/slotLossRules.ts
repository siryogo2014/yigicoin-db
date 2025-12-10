// lib/slotLossRules.ts
import type { Slot } from '@prisma/client';

export type LossCase =
    | 'CASE_1_PLATFORM_REPLACES_PARENT_WITH_2_CHILDREN'
    | 'CASE_2_SINGLE_CHILD_PROMOTES'
    | 'CASE_4_NO_CHILDREN_VACANT'
    | 'UNKNOWN';

export type LossCaseResult = {
    case: LossCase;
    parentSlot: Slot;
    leftChild: Slot | null;
    rightChild: Slot | null;
    promotingChild: Slot | null;
};

function isUserOwned(slot: Slot | null): boolean {
    return !!slot && slot.ownerType === 'USER' && !!slot.ownerUserId;
}

/**
 * Clasificador oficial M9 v2.
 *
 * Importante:
 * NO asumimos que `position` sea 0/1 por padre.
 * Tomamos los hijos directos ordenados por `position`
 * y consideramos como left/right los dos primeros.
 *
 * Caso 1: padre con 2 hijos USER -> PLATFORM ocupa el slot del padre.
 * Caso 2: padre con 1 hijo USER -> ese hijo sube.
 * Caso 4: padre sin hijos USER -> slot VACANT + acciones hacia el padre superior.
 *
 * Caso 3 es efecto del Caso 2 (no se clasifica como caso independiente).
 */
export function classifyLossCase(input: {
    parentSlot: Slot;
    children: Slot[];
}): LossCaseResult {
    const { parentSlot, children } = input;

    const ordered = [...children].sort((a, b) => a.position - b.position);

    const leftChild = ordered[0] ?? null;
    const rightChild = ordered[1] ?? null;

    const leftIsUser = isUserOwned(leftChild);
    const rightIsUser = isUserOwned(rightChild);

    // Caso 1
    if (leftIsUser && rightIsUser) {
        return {
            case: 'CASE_1_PLATFORM_REPLACES_PARENT_WITH_2_CHILDREN',
            parentSlot,
            leftChild,
            rightChild,
            promotingChild: null,
        };
    }

    // Caso 2
    if (leftIsUser !== rightIsUser) {
        const promotingChild = leftIsUser ? leftChild : rightChild;

        return {
            case: 'CASE_2_SINGLE_CHILD_PROMOTES',
            parentSlot,
            leftChild,
            rightChild,
            promotingChild,
        };
    }

    // Caso 4
    if (!leftIsUser && !rightIsUser) {
        return {
            case: 'CASE_4_NO_CHILDREN_VACANT',
            parentSlot,
            leftChild,
            rightChild,
            promotingChild: null,
        };
    }

    return {
        case: 'UNKNOWN',
        parentSlot,
        leftChild,
        rightChild,
        promotingChild: null,
    };
}
