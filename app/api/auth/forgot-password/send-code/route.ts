// app/api/auth/forgot-password/send-code/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateCode, hashCode, sendPasswordResetEmail } from '@/lib/emailVerification';

export async function POST(req: Request) {
    try {
        const { email } = await req.json();

        if (!email || typeof email !== 'string') {
            return NextResponse.json({ error: 'Email inválido' }, { status: 400 });
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            // En producción devolverías success para no filtrar usuarios.
            return NextResponse.json(
                { error: 'No existe una cuenta con este correo' },
                { status: 400 },
            );
        }

        const code = generateCode();
        const codeHash = hashCode(code);
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

        await prisma.passwordReset.create({
            data: { email, codeHash, expiresAt },
        });

        // Enviar código por email usando Resend
        try {
            await sendPasswordResetEmail(email, code);
            console.log(`✅ Código de recuperación enviado a ${email}`);
        } catch (emailError) {
            console.error('Error al enviar email:', emailError);
            // Mostrar el código en logs como fallback
            console.log(`⚠️ FALLBACK - Código de recuperación para ${email}: ${code}`);
        }

        return NextResponse.json({ success: true, message: 'Código enviado exitosamente' });
    } catch (e) {
        console.error('Error en send-code:', e);
        return NextResponse.json(
            { error: 'Error al enviar código de recuperación' },
            { status: 500 },
        );
    }
}
