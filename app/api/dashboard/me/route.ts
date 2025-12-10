// app/api/dashboard/me/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const email = searchParams.get('email');

        if (!email) {
            return NextResponse.json(
                { error: 'Missing email param ?email=' },
                { status: 400 },
            );
        }

        // Buscar usuario por email
        let user = await prisma.user.findUnique({
            where: { email },
        });

        // En desarrollo: si no existe, lo creamos vacío
        if (!user) {
            user = await prisma.user.create({
                data: {
                    email,
                    passwordHash: '',       // requerido por el schema
                    rank: 'registrado',     // enum UserRank
                    // points, balance, totems, isSuspended usan defaults del schema
                },
            });
        }

        return NextResponse.json({
            id: user.id,
            email: user.email,
            rank: user.rank,
            points: user.points,
            totems: user.totems,
            counterExpiresAt: user.counterExpiresAt,
            isSuspended: user.isSuspended,
        });
    } catch (err) {
        console.error('[dashboard/me] error', err);
        return NextResponse.json(
            { error: 'Server error' },
            { status: 500 },
        );
    }
}
