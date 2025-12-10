'use client';

import { useState } from 'react';
import type { Rank, UpgradeInfo } from '@/lib/ranksConfig';
import { getUpgradeInfoForRank } from '@/lib/ranksConfig';

type Props = {
    email: string;
    rank: Rank | string;
    reload: () => void;
};

export function RankUpgradeSection({ email, rank, reload }: Props) {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const rankTyped = rank as Rank;
    let upgradeInfo: UpgradeInfo | null = null;
    try {
        upgradeInfo = getUpgradeInfoForRank(rankTyped);
    } catch {
        upgradeInfo = null;
    }

    const handleDevUpgrade = async () => {
        if (!upgradeInfo) return;

        setLoading(true);
        setError(null);
        setMessage(null);
        try {
            const res = await fetch(
                `/api/ranks/upgrade?email=${encodeURIComponent(email)}`,
                { method: 'POST' },
            );
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                setError(data.error ?? 'Error al subir de rango (DEV)');
            } else {
                setMessage(
                    `Rango actualizado de ${data.oldRank} a ${data.newRank} (DEV sin pago).`,
                );
                reload();
            }
        } catch (err: any) {
            setError('Error de red en upgrade DEV');
        } finally {
            setLoading(false);
        }
    };

    const handlePaypalUpgrade = async () => {
        if (!upgradeInfo) return;

        setLoading(true);
        setError(null);
        setMessage(null);

        try {
            const res = await fetch(
                `/api/payments/paypal/create-order?email=${encodeURIComponent(email)}`,
                { method: 'POST' },
            );
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data.approveUrl) {
                setError(data.error ?? 'Error al crear orden PayPal');
                setLoading(false);
                return;
            }

            // Redirige a PayPal; luego volverá a /paypal/return
            window.location.href = data.approveUrl;
        } catch (err: any) {
            setError('Error de red creando orden PayPal');
            setLoading(false);
        }
    };

    // 🔹 AQUÍ VA EL MANEJADOR DE METAMASK DEMO 🔹
    const handleMetamaskDemo = async () => {
        if (typeof window === 'undefined') return;

        setLoading(true);
        setError(null);
        setMessage(null);

        try {
            const anyWindow = window as any;
            const ethereum = anyWindow.ethereum;

            if (!ethereum) {
                setError('MetaMask no está disponible en este navegador');
                setLoading(false);
                return;
            }

            const accounts: string[] = await ethereum.request({
                method: 'eth_requestAccounts',
            });

            if (!accounts || accounts.length === 0) {
                setError('No se obtuvo ninguna cuenta de MetaMask');
                setLoading(false);
                return;
            }

            const account = accounts[0];
            const message = `Upgrade de rango demo para ${email} desde ${account} en ${new Date().toISOString()}`;

            const signature: string = await ethereum.request({
                method: 'personal_sign',
                params: [message, account],
            });

            const res = await fetch(
                `/api/payments/metamask/demo-upgrade?email=${encodeURIComponent(email)}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ account, message, signature }),
                },
            );

            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                setError(data.error ?? 'Error en upgrade MetaMask demo');
            } else {
                setMessage(
                    `MetaMask demo OK. Rango de ${data.oldRank} a ${data.newRank}.`,
                );
                reload();
            }
        } catch (err: any) {
            console.error(err);
            setError('Error de red o MetaMask en demo');
        } finally {
            setLoading(false);
        }
    };

    if (!upgradeInfo) {
        return (
            <section className="border rounded p-4 space-y-2 mt-4">
                <h2 className="font-semibold">Upgrade de rango</h2>
                <p>Rango actual: {rank}</p>
                <p className="text-sm text-gray-500">
                    Ya tienes el rango máximo o no hay upgrade disponible.
                </p>
            </section>
        );
    }

    return (
        <section className="border rounded p-4 space-y-2 mt-4">
            <h2 className="font-semibold">Upgrade de rango</h2>
            <p>Rango actual: {rank}</p>
            <p>
                Siguiente rango: <strong>{upgradeInfo.nextRank}</strong>
            </p>
            <p>
                Precio: <strong>{upgradeInfo.priceUSD} USD</strong>
            </p>
            <p>
                Bono de puntos al subir: <strong>{upgradeInfo.bonusPoints}</strong>
            </p>

            <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button onClick={handleDevUpgrade} disabled={loading}>
                    Subir rango (DEV sin pago)
                </button>
                <button onClick={handlePaypalUpgrade} disabled={loading}>
                    Subir con PayPal (sandbox)
                </button>
                <button onClick={handleMetamaskDemo} disabled={loading}>
                    Subir con MetaMask (demo)
                </button>
            </div>


            {loading && <p className="text-sm text-gray-600">Procesando...</p>}
            {error && <p className="text-sm text-red-600">{error}</p>}
            {message && <p className="text-sm text-green-600">{message}</p>}
        </section>
    );
}
