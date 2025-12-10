// hooks/useUserHistory.ts
'use client';

import { useEffect, useState } from 'react';

export type PaymentEntry = {
    id: string;
    createdAt: string;
    amount: number;
    currency: string;
    status: string;
    method: string;
    provider: string;
    purpose: string | null;
    reference: string | null;
};

export type UpgradeEntry = {
    id: string;
    createdAt: string;
    fromRank: string;
    toRank: string;
    provider: string;
    paymentId: string | null;
};

type HistoryData = {
    payments: PaymentEntry[];
    upgrades: UpgradeEntry[];
};

export function useUserHistory(email: string | null) {
    const [data, setData] = useState<HistoryData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [version, setVersion] = useState(0);

    useEffect(() => {
        if (!email) return;

        let cancelled = false;

        const run = async () => {
            setLoading(true);
            setError(null);

            try {
                const res = await fetch(
                    `/api/dashboard/history?email=${encodeURIComponent(email)}`,
                );
                const json = await res.json();
                if (!res.ok || !json.ok) {
                    const msg =
                        json?.error ??
                        `HTTP ${res.status}`;
                    if (!cancelled) {
                        setError(msg);
                        setData(null);
                    }
                    return;
                }
                if (!cancelled) {
                    setData({
                        payments: json.payments ?? [],
                        upgrades: json.upgrades ?? [],
                    });
                }
            } catch (err: any) {
                if (!cancelled) {
                    setError(err?.message ?? 'ERROR_FETCH_HISTORY');
                    setData(null);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        run();

        return () => {
            cancelled = true;
        };
    }, [email, version]);

    const reload = () => setVersion((v) => v + 1);

    return { data, loading, error, reload };
}
