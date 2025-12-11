// lib/slotLossRules.ts
import type { Slot } from '@prisma/client';

/**
 * Casos oficiales y definitivos del sistema de pérdida/retención de slots.
 *
 * NOTA IMPORTANTE:
 * - No existe un CASE 3 independiente: es un efecto del CASE 2.
 * - Cualquier estado fuera de estos casos debe considerarse NO SOPORTADO
 *   para proteger la integridad del árbol.
 */
export type LossCase =
    | 'CASE_1_PLATFORM_REPLACES_PARENT_WITH_2_CHILDREN'
    | 'CASE_2_SINGLE_CHILD_PROMOTES'
    | 'CASE_4_NO_CHILDREN_VACANT'
    | 'UNSUPPORTED_STATE';

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
 * Clasificador oficial (M9 final).
 *
 * Importante:
 * - NO asumimos que `position` sea 0/1 por padre.
 * - Tomamos los hijos directos ordenados por `position`
 *   y consideramos como left/right los dos primeros.
 *
 * Casos válidos:
 * - Caso 1: padre con 2 hijos USER -> PLATFORM ocupa el slot del padre.
 * - Caso 2/3: padre con 1 hijo USER -> ese hijo sube y su slot original queda VACANT.
 * - Caso 4: padre sin hijos USER -> slot VACANT + acciones hacia el padre superior.
 *
 * Cualquier otra situación (incluyendo corrupción del árbol con >2 hijos)
 * se marca como UNSUPPORTED_STATE para que la capa de expropiación falle de forma controlada.
 */
export function classifyLossCase(input: {
    parentSlot: Slot;
    children: Slot[];
}): LossCaseResult {
    const { parentSlot, children } = input;

    const ordered = [...children].sort((a, b) => a.position - b.position);

    const leftChild = ordered[0] ?? null;
    const rightChild = ordered[1] ?? null;

    // Defensa contra corrupción de árbol (más de 2 hijos directos)
    if (ordered.length > 2) {
        return {
            case: 'UNSUPPORTED_STATE',
            parentSlot,
            leftChild,
            rightChild,
            promotingChild: null,
        };
    }

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

    // Caso 2/3
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
        case: 'UNSUPPORTED_STATE',
        parentSlot,
        leftChild,
        rightChild,
        promotingChild: null,
    };
}
