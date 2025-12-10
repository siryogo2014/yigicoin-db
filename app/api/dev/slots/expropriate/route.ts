import { NextRequest, NextResponse } from 'next/server';
import { isDevMode } from '@/lib/devMode';
import { expropriateUserByEmail } from '@/lib/slotExpropriation';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    if (!isDevMode()) {
        return NextResponse.json(
            { ok: false, code: 'DEV_ENDPOINT_DISABLED' },
            { status: 404 },
        );
    }

    const email = req.nextUrl.searchParams.get('email');
    if (!email) {
        return NextResponse.json(
            { ok: false, code: 'EMAIL_REQUIRED' },
            { status: 400 },
        );
    }

    const result = await expropriateUserByEmail(email);

    if (!result.ok) {
        return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
}
