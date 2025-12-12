// app/api/invites/create/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createInvitesForEmail } from '@/lib/invites';

// POST /api/invites/create?email=...
// Asegura hasta 2 enlaces de invitación activos para el usuario dueño.
export async function POST(req: NextRequest) {
    try {
        const email = req.nextUrl.searchParams.get('email');

        if (!email) {
            return NextResponse.json(
                {
                    ok: false,
                    code: 'EMAIL_REQUIRED',
                    message: 'Falta parámetro ?email=',
                },
                { status: 400 },
            );
        }

        const result = await createInvitesForEmail(email);

        if (!result.ok) {
            const status = result.code === 'USER_NOT_FOUND' ? 404 : 400;
            return NextResponse.json(
                {
                    ok: false,
                    code: result.code,
                    message: result.message,
                },
                { status },
            );
        }

        return NextResponse.json({
            ok: true,
            ownerEmail: email,
            invites: result.invites,
        });
    } catch (err: any) {
        console.error('Error in /api/invites/create:', err);
        return NextResponse.json(
            {
                ok: false,
                code: 'INVITE_CREATE_ERROR',
                message: err?.message ?? 'Unknown error',
            },
            { status: 500 },
        );
    }
}
