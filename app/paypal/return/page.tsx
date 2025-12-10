'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function getEmailFromContext() {
    if (typeof window === 'undefined') return null;

    const url = new URL(window.location.href);
    let email = url.searchParams.get('email') ?? undefined;

    if (!email) {
        const raw = localStorage.getItem('user_simulation_data');
        if (raw) {
            try {
                const stored = JSON.parse(raw);
                if (stored?.email) email = stored.email;
            } catch {
                // ignore
            }
        }
    }
    return email ?? null;
}

export default function PaypalReturnPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [status, setStatus] = useState<
        'idle' | 'processing' | 'success' | 'error'
    >('idle');
    const [message, setMessage] = useState<string | null>(null);

    useEffect(() => {
        const emailFromContext = getEmailFromContext();
        const emailParam = searchParams.get('email');
        const email = emailParam ?? emailFromContext;

        const token =
            searchParams.get('token') ?? searchParams.get('orderId') ?? null;

        if (!email || !token) {
            setStatus('error');
            setMessage('Faltan email o token en la URL de retorno.');
            return;
        }

        const run = async () => {
            setStatus('processing');
            try {
                const res = await fetch('/api/payments/paypal/capture-order', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token, email }),
                });

                const data = await res.json().catch(() => ({}));
                if (!res.ok || !data.ok) {
                    setStatus('error');
                    setMessage(
                        data.message ??
                        data.error ??
                        `Error al capturar el pago (${res.status})`,
                    );
                    return;
                }

                setStatus('success');
                if (data.upgrade) {
                    setMessage(
                        `Rango actualizado de ${data.upgrade.oldRank} a ${data.upgrade.newRank}.`,
                    );
                } else {
                    setMessage('Pago capturado correctamente.');
                }

                setTimeout(() => {
                    router.push('/panel');
                }, 2500);
            } catch (err: any) {
                setStatus('error');
                setMessage(`Error de red al capturar el pago: ${err.message}`);
            }
        };

        run();
    }, [searchParams, router]);

    return (
        <div className="p-6 space-y-2">
            <h1 className="text-2xl font-bold">Procesando pago PayPal...</h1>
            <p>Estado: {status}</p>
            {message && <p>{message}</p>}
            <button
                onClick={() => router.push('/panel')}
                className="border px-3 py-1 rounded mt-2"
            >
                Volver al panel
            </button>
        </div>
    );
}
