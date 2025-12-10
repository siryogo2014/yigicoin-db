// app/api/user/wallet/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
    const email = req.nextUrl.searchParams.get('email');

    if (!email) {
        return NextResponse.json({ ok: false, error: 'EMAIL_REQUIRED' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
        where: { email },
        select: {
            id: true,
            email: true,
            walletAddress: true,
        },
    });

    if (!user) {
        return NextResponse.json(
            { ok: false, error: 'USER_NOT_FOUND' },
            { status: 404 },
        );
    }

    return NextResponse.json({
        ok: true,
        email: user.email,
        walletAddress: user.walletAddress,
    });
}

export async function POST(req: NextRequest) {
    const email = req.nextUrl.searchParams.get('email');

    if (!email) {
        return NextResponse.json({ ok: false, error: 'EMAIL_REQUIRED' }, { status: 400 });
    }

    let body: any = null;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json(
            { ok: false, error: 'INVALID_JSON_BODY' },
            { status: 400 },
        );
    }

    const { address, message, signature } = body ?? {};

    if (!address) {
        return NextResponse.json(
            { ok: false, error: 'ADDRESS_REQUIRED' },
            { status: 400 },
        );
    }

    // Aquí podríamos validar la firma con ethers.verifyMessage, pero por ahora
    // esto sigue siendo DEMO y solo registramos la wallet.
    console.log('Link wallet payload:', { email, address, message, signature });

    try {
        const updated = await prisma.user.update({
            where: { email },
            data: {
                walletAddress: address,
            },
            select: {
                id: true,
                email: true,
                walletAddress: true,
            },
        });

        return NextResponse.json({
            ok: true,
            email: updated.email,
            walletAddress: updated.walletAddress,
        });
    } catch (err: any) {
        console.error('Error linking wallet', err);
        // Si la wallet ya está usada por otro usuario, fallará por el @unique
        return NextResponse.json(
            { ok: false, error: 'WALLET_LINK_FAILED' },
            { status: 500 },
        );
    }
}

export async function DELETE(req: NextRequest) {
    const email = req.nextUrl.searchParams.get('email');

    if (!email) {
        return NextResponse.json({ ok: false, error: 'EMAIL_REQUIRED' }, { status: 400 });
    }

    try {
        const updated = await prisma.user.update({
            where: { email },
            data: {
                walletAddress: null,
            },
            select: {
                id: true,
                email: true,
                walletAddress: true,
            },
        });

        return NextResponse.json({
            ok: true,
            email: updated.email,
            walletAddress: updated.walletAddress,
        });
    } catch (err: any) {
        console.error('Error unlinking wallet', err);
        return NextResponse.json(
            { ok: false, error: 'WALLET_UNLINK_FAILED' },
            { status: 500 },
        );
    }
}
