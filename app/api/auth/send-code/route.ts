// app/api/auth/send-code/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
    generateVerificationCode,
    hashCode,
    sendVerificationEmail,
} from '@/lib/emailVerification';

export async function POST(req: Request) {
    try {
        const { email } = await req.json();

        if (!email) {
            return NextResponse.json(
                { error: 'Correo requerido' },
                { status: 400 },
            );
        }

        const code = generateVerificationCode(6);
        const codeHash = hashCode(code);
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

        await prisma.emailVerification.create({
            data: {
                email,
                codeHash,
                expiresAt,
            },
        });

        await sendVerificationEmail(email, code);

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error(e);
        return NextResponse.json(
            { error: 'Error al enviar código' },
            { status: 500 },
        );
    }
}
