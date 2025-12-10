// lib/treeSponsors.ts
//
// Motor de sponsors por rango (regla de distancias r+1 sobre el árbol de slots)
//
// Regla clave del parche:
// - Un slot VACANT se trata como receptor de PLATAFORMA.
// - Solo ownerType === 'USER' con ownerUserId válido puede ser receptor 'user'.

import { prisma } from '@/lib/prisma';
import { PAYMENT_CONFIG } from '@/lib/paymentConfig';
import type { Slot, SlotOwnerType } from '@prisma/client';

export type PaymentTierId =
    | 'registro'   // 3 USD (entrada)
    | 'invitado'   // 5 USD
    | 'miembro'    // 10 USD
    | 'vip'        // 50 USD
    | 'premium'    // 400 USD
    | 'elite';     // 6000 USD

export type ReceiverType = 'platform' | 'user';

export type SponsorResolutionSuccess = {
    ok: true;
    tier: PaymentTierId;
    amountUSD: number;
    distanceLevels: number; // r+1
    payerUserId: string;
    payerSlotId: string | null;

    receiverType: ReceiverType;
    receiverSlotId: string | null;
    receiverSlotLabel: string | null;

    receiverUserId?: string | null;
    receiverUserEmail?: string | null;
    receiverUserRank?: string | null;
};

export type SponsorResolutionError = {
    ok: false;
    code: string;
    message: string;
};

export type SponsorResolution = SponsorResolutionSuccess | SponsorResolutionError;

// Mapeo fijo de "rango económico" -> niveles a subir en el árbol (r+1)
const TIER_DISTANCE_LEVELS: Record<PaymentTierId, number> = {
    registro: 1, // 3 USD
    invitado: 2, // 5 USD
    miembro: 3,  // 10 USD
    vip: 4,      // 50 USD
    premium: 5,  // 400 USD
    elite: 6,    // 6000 USD
};

function isPlatformLike(ownerType: SlotOwnerType) {
    return ownerType === 'PLATFORM' || ownerType === 'VACANT';
}

function getTierAmountUSD(tier: PaymentTierId): number {
    if (tier === 'registro') {
        return PAYMENT_CONFIG.paymentTypes.registro.amount;
    }

    const amounts =
        PAYMENT_CONFIG.paymentTypes.membresia.amounts as Record<string, number>;

    const value = amounts[tier];
    if (typeof value !== 'number') {
        throw new Error(`No amount configured for tier ${tier}`);
    }

    return value;
}

/**
 * Obtiene el slot raíz (P_ROOT): primer slot sin parentId.
 */
async function getRootSlot(): Promise<Slot | null> {
    return await prisma.slot.findFirst({
        where: { parentId: null },
        orderBy: [{ level: 'asc' }, { position: 'asc' }],
    });
}

/**
 * Obtiene el slot asociado a un usuario (si existe).
 * Si un usuario tuviera más de un slot, se escoge el de menor nivel/posición.
 */
async function getUserSlot(userId: string): Promise<Slot | null> {
    return await prisma.slot.findFirst({
        where: {
            ownerType: 'USER',
            ownerUserId: userId,
        },
        orderBy: [{ level: 'asc' }, { position: 'asc' }],
    });
}

/**
 * Sube `steps` niveles en el árbol desde un slot dado.
 * Si se sale por arriba del árbol, se devuelve siempre el slot raíz.
 */
async function ascendSlot(slotId: string, steps: number): Promise<Slot | null> {
    if (steps <= 0) {
        return await prisma.slot.findUnique({ where: { id: slotId } });
    }

    const root = await getRootSlot();
    if (!root) return null;

    const start = await prisma.slot.findUnique({ where: { id: slotId } });
    if (!start) return root;

    let cursor: Slot = start;

    for (let i = 0; i < steps; i++) {
        if (!cursor.parentId) return root;

        const parentSlot = await prisma.slot.findUnique({
            where: { id: cursor.parentId },
        });

        if (!parentSlot) return root;

        cursor = parentSlot;
    }

    return cursor;
}

/**
 * Resuelve quién debe cobrar un tier para un usuario concreto,
 * aplicando la regla r+1 niveles arriba.
 */
export async function findReceiverForTierByUserId(
    payerUserId: string,
    tier: PaymentTierId,
): Promise<SponsorResolution> {
    const distanceLevels = TIER_DISTANCE_LEVELS[tier];
    if (!distanceLevels) {
        return {
            ok: false,
            code: 'UNKNOWN_TIER',
            message: `Tier desconocido: ${tier}`,
        };
    }

    const payerUser = await prisma.user.findUnique({
        where: { id: payerUserId },
        select: { id: true, email: true },
    });

    if (!payerUser) {
        return {
            ok: false,
            code: 'USER_NOT_FOUND',
            message: 'Usuario no encontrado para cálculo de sponsor.',
        };
    }

    const root = await getRootSlot();
    if (!root) {
        return {
            ok: false,
            code: 'TREE_NOT_INITIALIZED',
            message: 'Árbol de slots no inicializado (no existe slot raíz).',
        };
    }

    const payerSlot = await getUserSlot(payerUser.id);
    const amountUSD = getTierAmountUSD(tier);

    // Si el usuario no tiene slot, todo cae a la raíz/plataforma.
    if (!payerSlot) {
        return {
            ok: true,
            tier,
            amountUSD,
            distanceLevels,
            payerUserId: payerUser.id,
            payerSlotId: null,
            receiverType: 'platform',
            receiverSlotId: root.id,
            receiverSlotLabel: root.label ?? null,
        };
    }

    const receiverSlot = await ascendSlot(payerSlot.id, distanceLevels);
    if (!receiverSlot) {
        return {
            ok: true,
            tier,
            amountUSD,
            distanceLevels,
            payerUserId: payerUser.id,
            payerSlotId: payerSlot.id,
            receiverType: 'platform',
            receiverSlotId: root.id,
            receiverSlotLabel: root.label ?? null,
        };
    }

    // Receptor USER válido
    if (receiverSlot.ownerType === 'USER' && receiverSlot.ownerUserId) {
        const receiverUser = await prisma.user.findUnique({
            where: { id: receiverSlot.ownerUserId },
            select: { id: true, email: true, rank: true },
        });

        if (receiverUser) {
            return {
                ok: true,
                tier,
                amountUSD,
                distanceLevels,
                payerUserId: payerUser.id,
                payerSlotId: payerSlot.id,
                receiverType: 'user',
                receiverSlotId: receiverSlot.id,
                receiverSlotLabel: receiverSlot.label ?? null,
                receiverUserId: receiverUser.id,
                receiverUserEmail: receiverUser.email,
                receiverUserRank: receiverUser.rank,
            };
        }
    }

    // PLATFORM o VACANT (o USER roto) => plataforma
    return {
        ok: true,
        tier,
        amountUSD,
        distanceLevels,
        payerUserId: payerUser.id,
        payerSlotId: payerSlot.id,
        receiverType: 'platform',
        receiverSlotId: receiverSlot.id,
        receiverSlotLabel: receiverSlot.label ?? null,
    };
}

/**
 * Helper dev: calcula sponsors para todos los tiers estándar para un usuario dado.
 */
export async function previewSponsorsForUser(
    userId: string,
): Promise<SponsorResolution[]> {
    const tiers: PaymentTierId[] = [
        'registro',
        'invitado',
        'miembro',
        'vip',
        'premium',
        'elite',
    ];

    const results: SponsorResolution[] = [];
    for (const tier of tiers) {
        results.push(await findReceiverForTierByUserId(userId, tier));
    }

    return results;
}
