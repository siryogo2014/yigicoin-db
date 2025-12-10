// app/api/store/buy-totem/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ECONOMY } from '@/lib/economyConfig';

export async function POST(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const email = searchParams.get('email');

        if (!email) {
            return NextResponse.json(
                { error: 'Missing email param ?email=' },
                { status: 400 },
            );
        }

        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 },
            );
        }

        const totemCost = ECONOMY.costs.totem;
        const maxTotems = ECONOMY.maxTotems;

        if (user.totems >= maxTotems) {
            return NextResponse.json(
                {
                    error: `Ya tienes el máximo de tótems (${maxTotems}).`,
                    code: 'MAX_TOTEMS',
                },
                { status: 400 },
            );
        }

        if (user.points < totemCost) {
            return NextResponse.json(
                {
                    error: `Puntos insuficientes. Necesitas ${totemCost} y tienes ${user.points}.`,
                    code: 'INSUFFICIENT_POINTS',
                },
                { status: 400 },
            );
        }

        const updated = await prisma.user.update({
            where: { id: user.id },
            data: {
                points: user.points - totemCost,
                totems: user.totems + 1,
            },
        });

        return NextResponse.json({
            ok: true,
            points: updated.points,
            totems: updated.totems,
        });
    } catch (err) {
        console.error('[store/buy-totem] error', err);
        return NextResponse.json(
            { error: 'Server error' },
            { status: 500 },
        );
    }
}
