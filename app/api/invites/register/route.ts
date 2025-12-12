import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

function jsonError(code: string, message: string, status = 400) {
    return NextResponse.json({ ok: false, code, message }, { status });
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json().catch(() => null);

        if (!body || typeof body !== 'object') {
            return jsonError('INVALID_BODY', 'Body inválido o ausente');
        }

        const {
            code,
            email,
            password,
            pin,
            username,
            firstName,
            lastName,
            phone,
            gender,
        } = body as {
            code?: string;
            email?: string;
            password?: string;
            pin?: string;
            username?: string;
            firstName?: string;
            lastName?: string;
            phone?: string;
            gender?: string;
        };

        const trimmedCode = (code ?? '').trim();
        const trimmedEmail = (email ?? '').trim().toLowerCase();
        const trimmedUsername = (username ?? '').trim();

        if (!trimmedCode) {
            return jsonError('INVITE_CODE_REQUIRED', 'El código de invitación es obligatorio');
        }
        if (!trimmedEmail || !password || !pin) {
            return jsonError(
                'MISSING_REQUIRED_FIELDS',
                'email, password y pin son obligatorios para el registro',
            );
        }

        // Validaciones básicas de formato (no me voy a poner fino aquí todavía)
        if (!trimmedEmail.includes('@')) {
            return jsonError('INVALID_EMAIL', 'Email inválido');
        }
        if (password.length < 6) {
            return jsonError('WEAK_PASSWORD', 'Password demasiado corta (mínimo 6 caracteres)');
        }
        if (pin.length < 4) {
            return jsonError('WEAK_PIN', 'PIN demasiado corto (mínimo 4 caracteres)');
        }

        // Transacción: validar invite + crear usuario + consumir invite
        const result = await prisma.$transaction(async (tx) => {
            // 1) Invite
            const invite = await tx.inviteLink.findUnique({
                where: { code: trimmedCode },
            });

            if (!invite) {
                throw {
                    type: 'INVITE_NOT_FOUND',
                    message: 'El código de invitación no existe',
                };
            }

            if (invite.status !== 'ACTIVE') {
                throw {
                    type: 'INVITE_NOT_ACTIVE',
                    message: `El código no está activo (estado actual: ${invite.status})`,
                };
            }

            if (invite.expiresAt && invite.expiresAt <= new Date()) {
                // Marca como expirado por higiene
                await tx.inviteLink.update({
                    where: { id: invite.id },
                    data: { status: 'EXPIRED' },
                });

                throw {
                    type: 'INVITE_EXPIRED',
                    message: 'El código de invitación ha expirado',
                };
            }

            // 2) Unicidad email / username
            const existingByEmail = await tx.user.findUnique({
                where: { email: trimmedEmail },
            });
            if (existingByEmail) {
                throw {
                    type: 'EMAIL_ALREADY_REGISTERED',
                    message: 'Ya existe un usuario con ese email',
                };
            }

            if (trimmedUsername) {
                const existingByUsername = await tx.user.findUnique({
                    where: { username: trimmedUsername },
                });
                if (existingByUsername) {
                    throw {
                        type: 'USERNAME_ALREADY_TAKEN',
                        message: 'Ese nombre de usuario ya está en uso',
                    };
                }
            }

            // 3) Hashes
            const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
            const pinHash = await bcrypt.hash(pin, SALT_ROUNDS);

            // 4) Crear usuario base
            const newUser = await tx.user.create({
                data: {
                    email: trimmedEmail,
                    username: trimmedUsername || null,
                    firstName: firstName?.trim() || null,
                    lastName: lastName?.trim() || null,
                    phone: phone?.trim() || null,
                    gender: gender?.trim() || null,
                    passwordHash,
                    pinHash,
                    // El resto de campos usan defaults del schema:
                    // rank = registrado, points = 0, registrationFeePaid = false, isActive = true, etc.
                },
            });

            // 5) Consumir invite (one-shot)
            await tx.inviteLink.update({
                where: { id: invite.id },
                data: {
                    status: 'CONSUMED',
                    consumedAt: new Date(),
                    consumedByUserId: newUser.id,
                },
            });

            return { newUserId: newUser.id };
        });

        return NextResponse.json({
            ok: true,
            userId: result.newUserId,
        });
    } catch (err: any) {
        // Errores esperados de negocio dentro de la transacción
        if (err && typeof err === 'object' && err.type && err.message) {
            const type = String(err.type);
            const message = String(err.message);

            switch (type) {
                case 'INVITE_NOT_FOUND':
                case 'INVITE_NOT_ACTIVE':
                case 'INVITE_EXPIRED':
                case 'EMAIL_ALREADY_REGISTERED':
                case 'USERNAME_ALREADY_TAKEN':
                    return jsonError(type, message, 400);
            }
        }

        console.error('M12 /api/invites/register error', err);
        return jsonError('INTERNAL_ERROR', 'Error interno en registro con invitación', 500);
    }
}
