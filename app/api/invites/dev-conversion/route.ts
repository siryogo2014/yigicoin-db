// app/api/invites/dev-conversion/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isDevMode } from '@/lib/devMode';

function getEmailFromLocalStorageFallback(): string | null {
  // ⚠️ Dev helper legacy. En server no existe localStorage;
  // se mantiene por compatibilidad con pruebas antiguas.
  return null;
}

// POST /api/invites/dev-conversion
// Dev-only: permite convertir un "registrado" en "basico" sin flujo real.
export async function POST(req: NextRequest) {
  if (!isDevMode()) {
    return NextResponse.json(
      { ok: false, code: 'DEV_ENDPOINT_DISABLED' },
      { status: 404 },
    );
  }

  try {
    const body = await req.json().catch(() => null);
    const email =
      body?.email?.toString().toLowerCase().trim() ??
      getEmailFromLocalStorageFallback();

    if (!email) {
      return NextResponse.json(
        { ok: false, code: 'EMAIL_REQUIRED' },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return NextResponse.json(
        { ok: false, code: 'USER_NOT_FOUND' },
        { status: 404 },
      );
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { rank: 'basico' as any },
    });

    return NextResponse.json({ ok: true, user: updated });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        code: 'DEV_CONVERSION_FAILED',
        message: err?.message ?? 'Unknown error',
      },
      { status: 500 },
    );
  }
}
