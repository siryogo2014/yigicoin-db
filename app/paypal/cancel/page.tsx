'use client';

import { useRouter } from 'next/navigation';

export default function PaypalCancelPage() {
    const router = useRouter();
    return (
        <div className="p-6 space-y-2">
            <h1 className="text-2xl font-bold">Pago cancelado</h1>
            <p>No se ha realizado el upgrade de rango.</p>
            <button
                onClick={() => router.push('/panel')}
                className="border px-3 py-1 rounded mt-2"
            >
                Volver al panel
            </button>
        </div>
    );
}
