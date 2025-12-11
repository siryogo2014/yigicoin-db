// lib/slotExpropriation.ts

import { prisma } from '@/lib/prisma';
import { classifyLossCase, type LossCaseResult } from '@/lib/slotLossRules';
import type { Prisma, Slot, SlotOwnerType } from '@prisma/client';

export type AuditEntry = {
    slotId: string;
    slotLabel: string | null;
    fromOwnerType: SlotOwnerType;
    fromOwnerUserId: string | null;
    toOwnerType: SlotOwnerType;
    toOwnerUserId: string | null;
    reason: string;
};

export type ExpropriationResult =
    | {
        ok: true;
        caseResult: LossCaseResult;
        audit: AuditEntry[];
        notifyUserId?: string | null;
        reinviteUserId?: string | null;
        addHours?: number;
    }
    | {
        ok: false;
        code: string;
        message: string;
    };

function buildAuditEntry(
    slot: Slot,
    toOwnerType: SlotOwnerType,
    toOwnerUserId: string | null,
    reason: string,
): AuditEntry {
    return {
        slotId: slot.id,
        slotLabel: slot.label ?? null,
        fromOwnerType: slot.ownerType,
        fromOwnerUserId: slot.ownerUserId ?? null,
        toOwnerType,
        toOwnerUserId,
        reason,
    };
}

async function recordTransfer(
    tx: Prisma.TransactionClient,
    audit: AuditEntry[],
    entry: AuditEntry,
): Promise<void> {
    audit.push(entry);

    await tx.slotTransferLog.create({
        data: {
            slotId: entry.slotId,
            slotLabel: entry.slotLabel ?? null,
            fromOwnerType: entry.fromOwnerType,
            fromOwnerUserId: entry.fromOwnerUserId ?? null,
            toOwnerType: entry.toOwnerType,
            toOwnerUserId: entry.toOwnerUserId ?? null,
            reason: entry.reason,
        },
    });
}

export async function expropriateUserByEmail(
    email: string,
): Promise<ExpropriationResult> {
    const normalizedEmail = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
        select: { id: true, email: true },
    });

    if (!user) {
        return {
            ok: false,
            code: 'USER_NOT_FOUND',
            message: 'Usuario no encontrado.',
        };
    }

    // Busca el slot que el usuario posee actualmente (ownerType = USER)
    const parentSlot = await prisma.slot.findFirst({
        where: {
            ownerType: 'USER',
            ownerUserId: user.id,
        },
    });

    if (!parentSlot) {
        return {
            ok: false,
            code: 'SLOT_NOT_FOUND',
            message: 'El usuario no tiene slot asignado.',
        };
    }

    return prisma.$transaction(async (tx) => {
        const audit: AuditEntry[] = [];

        // Refresca el slot dentro de la transacción
        const freshParent = await tx.slot.findUnique({
            where: { id: parentSlot.id },
        });

        if (!freshParent) {
            return {
                ok: false as const,
                code: 'SLOT_NOT_FOUND',
                message: 'El usuario no tiene slot asignado.',
            };
        }

        const freshChildren = await tx.slot.findMany({
            where: { parentId: freshParent.id },
            orderBy: { position: 'asc' },
        });

        const caseResult = classifyLossCase({
            parentSlot: freshParent,
            children: freshChildren,
        });

        const freshGrandParent = freshParent.parentId
            ? await tx.slot.findUnique({ where: { id: freshParent.parentId } })
            : null;

        // =========================
        // CASE 1
        // Padre con 2 hijos USER -> PLATFORM reemplaza el slot del padre
        // =========================
        if (caseResult.case === 'CASE_1_PLATFORM_REPLACES_PARENT_WITH_2_CHILDREN') {
            await recordTransfer(
                tx,
                audit,
                buildAuditEntry(
                    freshParent,
                    'PLATFORM',
                    null,
                    'CASE_1: PLATFORM reemplaza padre con 2 hijos USER',
                ),
            );

            await tx.slot.update({
                where: { id: freshParent.id },
                data: {
                    ownerType: 'PLATFORM',
                    ownerUserId: null,
                },
            });

            return {
                ok: true as const,
                caseResult,
                audit,
            };
        }

        // =========================
        // CASE 2/3
        // Padre con 1 hijo USER -> el hijo asciende y su slot queda VACANT
        // =========================
        if (
            caseResult.case === 'CASE_2_SINGLE_CHILD_PROMOTES' &&
            caseResult.promotingChild
        ) {
            const child = caseResult.promotingChild;

            await recordTransfer(
                tx,
                audit,
                buildAuditEntry(
                    freshParent,
                    'USER',
                    child.ownerUserId ?? null,
                    'CASE_2/3: hijo único asciende al slot del padre',
                ),
            );

            await tx.slot.update({
                where: { id: freshParent.id },
                data: {
                    ownerType: 'USER',
                    ownerUserId: child.ownerUserId ?? null,
                },
            });

            await recordTransfer(
                tx,
                audit,
                buildAuditEntry(
                    child,
                    'VACANT',
                    null,
                    'CASE_2/3: slot original del hijo queda VACANT tras ascenso',
                ),
            );

            await tx.slot.update({
                where: { id: child.id },
                data: {
                    ownerType: 'VACANT',
                    ownerUserId: null,
                },
            });

            return {
                ok: true as const,
                caseResult,
                audit,
            };
        }

        // =========================
        // CASE 4
        // Padre sin hijos USER -> slot VACANT + abuelo recibe +48h y derecho a re-invitar
        // =========================
        if (caseResult.case === 'CASE_4_NO_CHILDREN_VACANT') {
            await recordTransfer(
                tx,
                audit,
                buildAuditEntry(
                    freshParent,
                    'VACANT',
                    null,
                    'CASE_4: padre sin hijos USER, slot pasa a VACANT',
                ),
            );

            await tx.slot.update({
                where: { id: freshParent.id },
                data: {
                    ownerType: 'VACANT',
                    ownerUserId: null,
                },
            });

            let notifyUserId: string | null = null;
            let addHours: number | undefined = undefined;

            if (
                freshGrandParent &&
                freshGrandParent.ownerType === 'USER' &&
                freshGrandParent.ownerUserId
            ) {
                notifyUserId = freshGrandParent.ownerUserId;
                addHours = 48;

                const userToNotify = await tx.user.findUnique({
                    where: { id: notifyUserId },
                    select: { counterExpiresAt: true },
                });

                const now = new Date();
                const base =
                    userToNotify?.counterExpiresAt &&
                        userToNotify.counterExpiresAt > now
                        ? userToNotify.counterExpiresAt
                        : now;

                const newExpires = new Date(
                    base.getTime() + addHours * 60 * 60 * 1000,
                );

                await tx.user.update({
                    where: { id: notifyUserId },
                    data: {
                        counterExpiresAt: newExpires,
                    },
                });
            }

            return {
                ok: true as const,
                caseResult,
                audit,
                notifyUserId,
                reinviteUserId: notifyUserId,
                addHours,
            };
        }

        // Cualquier estado que no sea 1, 2/3 o 4
        return {
            ok: false as const,
            code: 'UNSUPPORTED_CASE',
            message: 'El caso no pudo resolverse con las reglas actuales.',
        };
    });
}
