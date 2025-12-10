// lib/devGuard.ts
import { NextResponse } from 'next/server';
import { isDevMode } from './devMode';

export function devOnlyResponse() {
    if (isDevMode()) return null;

    return NextResponse.json(
        { ok: false, code: 'DEV_ENDPOINT_DISABLED' },
        { status: 404 }
    );
}
