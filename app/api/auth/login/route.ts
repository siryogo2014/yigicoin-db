// app/api/auth/login/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
    try {
        const { email, password, pin } = await req.json();

        if (!email || !password || !pin) {
            return NextResponse.json(
                { error: 'Debes ingresar correo, contraseña y PIN' },
                { status: 400 },
            );
        }

        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            return NextResponse.json(
                { error: 'Credenciales incorrectas' },
                { status: 401 },
            );
        }

        const validPass = await bcrypt.compare(password, user.passwordHash);
        if (!validPass) {
            return NextResponse.json(
                { error: 'Credenciales incorrectas' },
                { status: 401 },
            );
        }

        if (!user.pinHash) {
            return NextResponse.json(
                { error: 'Tu cuenta no tiene PIN configurado' },
                { status: 403 },
            );
        }

        const validPin = await bcrypt.compare(pin, user.pinHash);
        if (!validPin) {
            return NextResponse.json(
                { error: 'PIN incorrecto' },
                { status: 401 },
            );
        }

        if (!user.registrationFeePaid) {
            return NextResponse.json(
                { error: 'Tu registro no está completo, finaliza el pago.' },
                { status: 403 },
            );
        }

        const clientUser = {
            id: user.id,
            name: user.name ?? `${user.firstName} ${user.lastName}`,
            email: user.email,
            username: user.username,
            phone: user.phone,
            gender: user.gender,

            currentRank: user.rank,
            hasCompletedRegistration: true,
            points: user.points,
            balance: user.balance || 10000,
            totems: user.totems,
            isSuspended: user.isSuspended,
            counterExpiresAt: user.counterExpiresAt,
        };

        return NextResponse.json({ success: true, user: clientUser });
    } catch (e) {
        console.error(e);
        return NextResponse.json(
            { error: 'Error al iniciar sesión' },
            { status: 500 },
        );
    }
}
