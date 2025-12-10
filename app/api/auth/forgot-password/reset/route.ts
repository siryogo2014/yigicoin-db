// app/api/auth/forgot-password/reset/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { hashCode } from '@/lib/emailVerification';

export async function POST(req: Request) {
    try {
        const { email, code, password, pin } = await req.json();

        if (!email || !code || !password || !pin) {
            return NextResponse.json(
                { error: 'Datos incompletos' },
                { status: 400 },
            );
        }

        if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
            return NextResponse.json(
                { error: 'El PIN debe ser de 4 dígitos numéricos' },
                { status: 400 },
            );
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return NextResponse.json(
                { error: 'Usuario no encontrado' },
                { status: 400 },
            );
        }

        const record = await prisma.passwordReset.findFirst({
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
                { error: 'El código ha expirado, solicita uno nuevo' },
                { status: 400 },
            );
        }

        const hashedInput = hashCode(code);
        if (record.codeHash !== hashedInput) {
            return NextResponse.json(
                { error: 'Código incorrecto' },
                { status: 400 },
            );
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const pinHash = await bcrypt.hash(pin, 10);

        await prisma.$transaction([
            prisma.passwordReset.update({
                where: { id: record.id },
                data: { used: true },
            }),
            prisma.user.update({
                where: { email },
                data: {
                    passwordHash,
                    pinHash,
                },
            }),
        ]);

        console.log(`✅ Contraseña y PIN actualizados exitosamente para ${email}`);
        return NextResponse.json({ 
            success: true, 
            message: 'Contraseña y PIN actualizados exitosamente' 
        });
    } catch (e) {
        console.error('Error en reset:', e);
        return NextResponse.json(
            { error: 'Error al restablecer contraseña' },
            { status: 500 },
        );
    }
}
