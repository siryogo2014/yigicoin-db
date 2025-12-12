// lib/suspensionRules.ts
import type { UserRank } from '@prisma/client';

export type SuspensionRule = {
    rank: UserRank;
    canRecover: boolean;
    fineUSD: number;
    /**
     * Horas de gracia para pagar la multa antes de que la cuenta
     * pase a estado "inhabilitado" según las reglas del sistema.
     *
     * Para registrado es 0 porque no puede recuperar.
     */
    graceHours: number;
};

const RULES: Record<UserRank, SuspensionRule> = {
    registrado: {
        rank: 'registrado',
        canRecover: false,
        fineUSD: 0,
        graceHours: 0,
    },
    invitado: {
        rank: 'invitado',
        canRecover: true,
        fineUSD: 10,
        graceHours: 96,
    },
    miembro: {
        rank: 'miembro',
        canRecover: true,
        fineUSD: 10,
        graceHours: 96,
    },
    vip: {
        rank: 'vip',
        canRecover: true,
        fineUSD: 30,
        graceHours: 96,
    },
    premium: {
        rank: 'premium',
        canRecover: true,
        fineUSD: 50,
        graceHours: 96,
    },
    elite: {
        rank: 'elite',
        canRecover: true,
        fineUSD: 100,
        graceHours: 96,
    },
};

/**
 * Devuelve la regla de suspensión/multa para un rango concreto.
 * No toca base de datos, es pura.
 */
export function getSuspensionRule(rank: UserRank): SuspensionRule {
    return RULES[rank];
}
