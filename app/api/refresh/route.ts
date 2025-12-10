// app/api/refresh/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { isDevMode } from '@/lib/devMode';

export async function POST(_req: NextRequest) {
  // Este endpoint era un stub de simulación.
  // Mejor cerrarlo fuera de DEV para no exponer lógica falsa en producción.
  if (!isDevMode()) {
    return NextResponse.json(
      { ok: false, code: 'DEV_ENDPOINT_DISABLED' },
      { status: 404 },
    );
  }

  return NextResponse.json({
    ok: false,
    code: 'SIMULATION_ONLY',
    message:
      'Este endpoint es solo de laboratorio. Implementa la versión real basada en puntos y DB.',
  });
}
