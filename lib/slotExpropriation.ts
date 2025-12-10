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
    slot: Pick<Slot, 'id' | 'label' | 'ownerType' | 'ownerUserId'>,
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
) {
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

    const parentSlot = await prisma.slot.findFirst({
        where: {
            ownerType: 'USER',
            ownerUserId: user.id,
        },
    });

    if (!parentSlot) {
        const anyOwnedSlot = await prisma.slot.findFirst({
            where: { ownerUserId: user.id },
        });

        if (anyOwnedSlot) {
            return {
                ok: false,
                code: 'ALREADY_PROCESSED',
                message:
                    'El usuario ya no posee un slot USER; probablemente ya fue procesado por expropiación.',
            };
        }

        return {
            ok: false,
            code: 'SLOT_NOT_FOUND',
            message: 'El usuario no tiene slot asignado.',
        };
    }

    return await prisma.$transaction(async (tx) => {
        const audit: AuditEntry[] = [];

        const freshParent = await tx.slot.findUnique({
            where: { id: parentSlot.id },
        });

        if (!freshParent) {
            return {
                ok: false,
                code: 'SLOT_NOT_FOUND',
                message: 'Slot padre no encontrado.',
            };
        }

        const freshChildren = await tx.slot.findMany({
            where: { parentId: freshParent.id },
            orderBy: { position: 'asc' },
        });

        const freshCase = classifyLossCase({
            parentSlot: freshParent,
            children: freshChildren,
        });

        const freshGrandParent = freshParent.parentId
            ? await tx.slot.findUnique({ where: { id: freshParent.parentId } })
            : null;

        // CASE 1: padre con 2 hijos USER -> PLATFORM ocupa el slot del padre
        if (freshCase.case === 'CASE_1_PLATFORM_REPLACES_PARENT_WITH_2_CHILDREN') {
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
                data: { ownerType: 'PLATFORM', ownerUserId: null },
            });

            return { ok: true, caseResult: freshCase, audit };
        }

        // CASE 2 + 3: padre con 1 hijo USER -> hijo asciende y su slot original queda VACANT
        if (freshCase.case === 'CASE_2_SINGLE_CHILD_PROMOTES' && freshCase.promotingChild) {
            const child = freshCase.promotingChild;

            // 2.1 hijo ocupa slot del padre
            await recordTransfer(
                tx,
                audit,
                buildAuditEntry(
                    freshParent,
                    'USER',
                    child.ownerUserId ?? null,
                    'CASE_2: hijo único asciende al slot del padre',
                ),
            );

            await tx.slot.update({
                where: { id: freshParent.id },
                data: {
                    ownerType: 'USER',
                    ownerUserId: child.ownerUserId,
                },
            });

            // 2.2 slot original del hijo queda VACANT
            await recordTransfer(
                tx,
                audit,
                buildAuditEntry(
                    child,
                    'VACANT',
                    null,
                    'CASE_3: slot original del hijo queda VACANT tras ascenso',
                ),
            );

            await tx.slot.update({
                where: { id: child.id },
                data: { ownerType: 'VACANT', ownerUserId: null },
            });

            return { ok: true, caseResult: freshCase, audit };
        }

        // CASE 4: padre sin hijos USER -> slot VACANT + notificar + +48h
        if (freshCase.case === 'CASE_4_NO_CHILDREN_VACANT') {
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
                data: { ownerType: 'VACANT', ownerUserId: null },
            });

            const notifyUserId =
                freshGrandParent?.ownerType === 'USER'
                    ? freshGrandParent.ownerUserId
                    : null;

            return {
                ok: true,
                caseResult: freshCase,
                audit,
                notifyUserId,
                reinviteUserId: notifyUserId,
                addHours: notifyUserId ? 48 : undefined,
            };
        }

        return {
            ok: false,
            code: 'UNSUPPORTED_CASE',
            message: 'El caso no pudo resolverse con las reglas actuales.',
        };
    });
}
