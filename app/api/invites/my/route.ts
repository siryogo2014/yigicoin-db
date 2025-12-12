// app/api/invites/my/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { listInvitesForEmail } from '@/lib/invites';

// GET /api/invites/my?email=...
export async function GET(req: NextRequest) {
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

        const result = await listInvitesForEmail(email);

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
        console.error('Error in /api/invites/my:', err);
        return NextResponse.json(
            {
                ok: false,
                code: 'INVITE_LIST_ERROR',
                message: err?.message ?? 'Unknown error',
            },
            { status: 500 },
        );
    }
}
