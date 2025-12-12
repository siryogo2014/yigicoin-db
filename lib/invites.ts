// lib/invites.ts
import { prisma } from '@/lib/prisma';
import { randomBytes } from 'crypto';

export type InviteStatus = 'ACTIVE' | 'CONSUMED' | 'EXPIRED';

export type InviteDTO = {
    id: string;
    code: string;
    status: InviteStatus;
    ownerUserId: string;
    consumedByUserId: string | null;
    expiresAt: string | null;
    consumedAt: string | null;
    createdAt: string;
};

export type CreateInvitesResult =
    | {
        ok: true;
        invites: InviteDTO[];
    }
    | {
        ok: false;
        code: string;
        message: string;
    };

export type ListInvitesResult =
    | {
        ok: true;
        invites: InviteDTO[];
    }
    | {
        ok: false;
        code: string;
        message: string;
    };

const MAX_ACTIVE_INVITES_PER_USER = 2;
const DEFAULT_INVITE_TTL_DAYS = 7;

function toDTO(invite: any): InviteDTO {
    return {
        id: invite.id,
        code: invite.code,
        status: invite.status,
        ownerUserId: invite.ownerUserId,
        consumedByUserId: invite.consumedByUserId ?? null,
        expiresAt: invite.expiresAt ? invite.expiresAt.toISOString() : null,
        consumedAt: invite.consumedAt ? invite.consumedAt.toISOString() : null,
        createdAt: invite.createdAt.toISOString(),
    };
}

function generateInviteCode() {
    // 32 chars hex ~ 128 bits
    return randomBytes(16).toString('hex');
}

// Asegura hasta 2 invites activos para ese email
export async function createInvitesForEmail(email: string): Promise<CreateInvitesResult> {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
        return {
            ok: false,
            code: 'EMAIL_REQUIRED',
            message: 'Email es requerido',
        };
    }

    const user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
    });

    if (!user) {
        return {
            ok: false,
            code: 'USER_NOT_FOUND',
            message: 'No existe usuario con ese email',
        };
    }

    const now = new Date();

    const activeInvites = await prisma.inviteLink.findMany({
        where: {
            ownerUserId: user.id,
            status: 'ACTIVE',
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
        orderBy: { createdAt: 'asc' },
    });

    const currentlyActive = activeInvites.length;

    if (currentlyActive >= MAX_ACTIVE_INVITES_PER_USER) {
        return {
            ok: true,
            invites: activeInvites.map(toDTO),
        };
    }

    const toCreate = MAX_ACTIVE_INVITES_PER_USER - currentlyActive;
    const expiresAt = new Date(
        now.getTime() + DEFAULT_INVITE_TTL_DAYS * 24 * 60 * 60 * 1000,
    );

    const created: any[] = [];

    for (let i = 0; i < toCreate; i++) {
        const code = generateInviteCode();

        const invite = await prisma.inviteLink.create({
            data: {
                code,
                ownerUserId: user.id,
                status: 'ACTIVE',
                expiresAt,
            },
        });

        created.push(invite);
    }

    const allActive = [...activeInvites, ...created];

    return {
        ok: true,
        invites: allActive.map(toDTO),
    };
}

export async function listInvitesForEmail(email: string): Promise<ListInvitesResult> {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
        return {
            ok: false,
            code: 'EMAIL_REQUIRED',
            message: 'Email es requerido',
        };
    }

    const user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
    });

    if (!user) {
        return {
            ok: false,
            code: 'USER_NOT_FOUND',
            message: 'No existe usuario con ese email',
        };
    }

    const invites = await prisma.inviteLink.findMany({
        where: { ownerUserId: user.id },
        orderBy: { createdAt: 'desc' },
    });

    return {
        ok: true,
        invites: invites.map(toDTO),
    };
}
