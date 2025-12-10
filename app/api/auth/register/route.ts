// app/api/auth/register/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const {
            firstName,
            lastName,
            username,
            email,
            phone,
            gender,
            password,
            pin,          // NUEVO
            referralCode, // se usará después
        } = body;

        if (
            !firstName ||
            !lastName ||
            !username ||
            !email ||
            !phone ||
            !gender ||
            !password ||
            !pin
        ) {
            return NextResponse.json(
                { error: 'Faltan datos obligatorios' },
                { status: 400 },
            );
        }

        if (!/^\d{4}$/.test(pin)) {
            return NextResponse.json(
                { error: 'El PIN debe ser de 4 dígitos numéricos' },
                { status: 400 },
            );
        }

        const existingByEmail = await prisma.user.findUnique({ where: { email } });
        if (existingByEmail) {
            return NextResponse.json(
                { error: 'El correo ya está registrado' },
                { status: 400 },
            );
        }

        const existingByUsername = await prisma.user.findUnique({
            where: { username },
        });
        if (existingByUsername) {
            return NextResponse.json(
                { error: 'El nombre de usuario ya está en uso' },
                { status: 400 },
            );
        }

        const verification = await prisma.emailVerification.findFirst({
            where: { email, used: true },
            orderBy: { createdAt: 'desc' },
        });

        if (!verification) {
            return NextResponse.json(
                { error: 'Debes verificar tu correo antes de crear la cuenta' },
                { status: 400 },
            );
        }

        const payment = await prisma.payment.findFirst({
            where: {
                email,
                purpose: 'registration_fee',
                status: 'completed',
            },
            orderBy: { createdAt: 'desc' },
        });

        if (!payment) {
            return NextResponse.json(
                { error: 'No se encontró un pago de registro completado' },
                { status: 400 },
            );
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const pinHash = await bcrypt.hash(pin, 10); // NUEVO

        const user = await prisma.user.create({
            data: {
                firstName,
                lastName,
                username,
                email,
                phone,
                gender,
                passwordHash,
                pinHash,              // NUEVO
                emailVerifiedAt: new Date(),
                registrationFeePaid: true,

                name: `${firstName} ${lastName}`,
                isOwner: false,
            },
        });

        // más adelante: conectar referralCode al árbol

        return NextResponse.json({ success: true, userId: user.id });
    } catch (e) {
        console.error(e);
        return NextResponse.json(
            { error: 'Error al crear cuenta' },
            { status: 500 },
        );
    }
}
