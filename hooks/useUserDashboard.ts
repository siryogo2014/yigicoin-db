// hooks/useUserDashboard.ts
'use client';

import { useCallback, useEffect, useState } from 'react';

export interface UserDashboardData {
    id: string;
    email: string;
    rank: string;
    points: number;
    totems: number;
    counterExpiresAt: string | null;
    isSuspended: boolean;
}

export function useUserDashboard() {
    const [data, setData] = useState<UserDashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            if (typeof window === 'undefined') return;

            const url = new URL(window.location.href);
            let email = url.searchParams.get('email') ?? undefined;

            if (!email) {
                const raw = localStorage.getItem('user_simulation_data');
                if (raw) {
                    try {
                        const stored = JSON.parse(raw);
                        if (stored?.email) email = stored.email;
                    } catch {
                        // ignoramos
                    }
                }
            }

            if (!email) {
                setError(
                    'No se pudo determinar el email. Usa /panel?email=tu@correo.com o inicia sesión.'
                );
                setLoading(false);
                return;
            }

            const res = await fetch(
                `/api/dashboard/me?email=${encodeURIComponent(email)}`
            );

            const json = await res.json().catch(() => ({}));

            if (!res.ok) {
                setError(
                    `HTTP ${res.status}: ${(json as any).error ?? 'Error cargando dashboard'}`
                );
                setLoading(false);
                return;
            }

            setData(json as UserDashboardData);
        } catch (err: any) {
            console.error(err);
            setError(err.message ?? 'Error cargando dashboard');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    return { data, loading, error, reload: load };
}
