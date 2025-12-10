import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Duraciones DEMO: cortas para probar, luego las cambias a horas
function secondsForRank(rank: string) {
  switch (rank) {
    case 'invitado':
    case 'miembro':
      return 60;  // 1 min
    case 'vip':
      return 90;  // 1.5 min
    case 'premium':
      return 120; // 2 min
    case 'elite':
      return 180; // 3 min
    default:
      return 60;  // registrado
  }
}

export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        { error: 'Missing email param ?email=' },
        { status: 400 }
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

    const now = new Date();

    // Si ya está suspendido, no hacemos nada más
    if (user.isSuspended) {
      return NextResponse.json({
        status: 'suspended',
        totems: user.totems,
        counterExpiresAt: user.counterExpiresAt,
      });
    }

    // Si aún no expiró, solo devolvemos el estado
    if (user.counterExpiresAt && user.counterExpiresAt > now) {
      return NextResponse.json({
        status: 'active',
        totems: user.totems,
        counterExpiresAt: user.counterExpiresAt,
      });
    }

    // Aquí: el contador expiró o estaba vacío

    // Caso 1: hay tótems → consumir 1 y reiniciar tiempo
    if (user.totems > 0) {
      const newTotems = user.totems - 1;
      const seconds = secondsForRank(user.rank);
      const newExpiresAt = new Date(now.getTime() + seconds * 1000);

      const updated = await prisma.user.update({
        where: { id: user.id },
        data: {
          totems: newTotems,
          counterExpiresAt: newExpiresAt,
        },
      });

      return NextResponse.json({
        status: 'totem_used',
        totems: updated.totems,
        counterExpiresAt: updated.counterExpiresAt,
      });
    }

    // Caso 2: sin tótems → suspender cuenta
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        isSuspended: true,
      },
    });

    return NextResponse.json({
      status: 'suspended',
      totems: updated.totems,
      counterExpiresAt: updated.counterExpiresAt,
    });
  } catch (err) {
    console.error('[counter/heartbeat] error', err);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 },
    );
  }
}
