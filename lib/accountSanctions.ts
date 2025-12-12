import { prisma } from '@/lib/prisma';
import type { UserRank } from '@prisma/client';
import { getSuspensionRule } from '@/lib/suspensionRules';

export type AccountSanctionReasonType = 'EXPROPRIATION' | 'MANUAL';

export interface CreateAccountSanctionInput {
    userId: string;
    slotId?: string | null;
    rankAtExpropriation: UserRank;
    reason: AccountSanctionReasonType;
}

export async function createAccountSanction(
    input: CreateAccountSanctionInput,
) {
    const rule = getSuspensionRule(input.rankAtExpropriation);

    // Si no puede recuperar o la multa es 0, NO creamos sanción
    if (!rule.canRecover || rule.fineUSD <= 0 || rule.graceHours <= 0) {
        return {
            created: false as const,
            rule,
            sanction: null,
        };
    }

    const now = new Date();
    const deadline = new Date(
        now.getTime() + rule.graceHours * 60 * 60 * 1000,
    );

    const sanction = await prisma.accountSanction.create({
        data: {
            userId: input.userId,
            slotId: input.slotId ?? undefined,
            rankAtExpropriation: input.rankAtExpropriation,
            fineUSD: rule.fineUSD,
            graceHours: rule.graceHours,
            deadlineAt: deadline,
            status: 'PENDING',
            reason: input.reason,
        },
    });

    return {
        created: true as const,
        rule,
        sanction,
    };
}
