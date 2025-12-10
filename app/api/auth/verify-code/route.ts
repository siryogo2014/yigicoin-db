// app/api/auth/verify-code/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashCode } from '@/lib/emailVerification';

export async function POST(req: Request) {
    try {
        const { email, code } = await req.json();

        if (!email || !code) {
            return NextResponse.json(
                { error: 'Datos incompletos' },
                { status: 400 },
            );
        }

        const hashed = hashCode(code.toString());

        const record = await prisma.emailVerification.findFirst({
            where: { email, used: false },
            orderBy: { createdAt: 'desc' },
        });

        if (!record) {
            return NextResponse.json(
                { error: 'No hay código activo para este correo' },
                { status: 400 },
            );
        }

        if (record.expiresAt < new Date()) {
            return NextResponse.json(
                { error: 'El código ha expirado' },
                { status: 400 },
            );
        }

        if (record.codeHash !== hashed) {
            return NextResponse.json(
                { error: 'Código incorrecto' },
                { status: 400 },
            );
        }

        await prisma.emailVerification.update({
            where: { id: record.id },
            data: { used: true },
        });

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error(e);
        return NextResponse.json(
            { error: 'Error al verificar código' },
            { status: 500 },
        );
    }
}
