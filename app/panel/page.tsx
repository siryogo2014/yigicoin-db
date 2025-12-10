'use client';

import { ECONOMY } from '@/lib/economyConfig';
import { useEffect, useMemo, useState, useCallback } from 'react';
import type { FormEvent } from 'react';
import { useUserDashboard } from '@/hooks/useUserDashboard';
import { useUserHistory } from '@/hooks/useUserHistory';

// Flag de modo DEV/DEMO para mostrar u ocultar botones peligrosos
const IS_DEV = process.env.NEXT_PUBLIC_DEV_MODE === 'true';
const PLATFORM_ADDRESS = process.env.NEXT_PUBLIC_WEB3_PLATFORM_ADDRESS;
const TEST_VALUE_HEX =
    process.env.NEXT_PUBLIC_WEB3_TEST_VALUE_HEX ?? '0x38d7ea4c68000'; // ~0.001 ETH
console.log('PLATFORM_ADDRESS_FRONT', PLATFORM_ADDRESS);
console.log('TEST_VALUE_HEX_FRONT', TEST_VALUE_HEX);

type UpgradeInfoState = {
    currentRank: string;
    nextRank: string;
    priceUSD: number;
    bonusPoints: number;
};

type SponsorPreviewItem = {
    ok: boolean;
    tier?: string;
    amountUSD?: number;
    distanceLevels?: number;
    receiverType?: 'platform' | 'user';
    receiverSlotLabel?: string | null;
    receiverUserEmail?: string | null;
    receiverUserRank?: string | null;
    code?: string;
    message?: string;
};

type SponsorPreviewState = {
    user: {
        id: string;
        email: string;
        rank: string;
    };
    results: SponsorPreviewItem[];
};

type SlotTreeItem = {
    id: string;
    label: string | null;
    level: number;
    position: number;
    parentId: string | null;
    ownerType: 'PLATFORM' | 'USER' | 'VACANT';
    ownerUserEmail?: string | null;
    ownerUserRank?: string | null;
};


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

export default function PanelPage() {
    const { data, loading, error, reload } = useUserDashboard();
    const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
    const [heartbeatStatus, setHeartbeatStatus] = useState<string | null>(null);


    // Email disponible para todos los handlers y efectos
    const email = useMemo(() => getEmailFromContext(), []);

    const {
        data: history,
        loading: historyLoading,
        error: historyError,
    } = useUserHistory(email);


    // --- ESTADO PARA UPGRADE DE RANGO ---
    const [upgradeInfo, setUpgradeInfo] = useState<UpgradeInfoState | null>(null);
    const [upgradeLoading, setUpgradeLoading] = useState(false);
    const [upgradeError, setUpgradeError] = useState<string | null>(null);
    const [upgradeMessage, setUpgradeMessage] = useState<string | null>(null);

    // --- ESTADO PARA WALLET / METAMASK ---
    const [walletAddress, setWalletAddress] = useState<string | null>(null);
    const [walletLoading, setWalletLoading] = useState(false);
    const [walletError, setWalletError] = useState<string | null>(null);
    const [walletMessage, setWalletMessage] = useState<string | null>(null);

    // --- ESTADO / LÓGICA DEL ÁRBOL DE SLOTS (M6) ---
    const [slots, setSlots] = useState<SlotTreeItem[]>([]);
    const [slotsLoading, setSlotsLoading] = useState(false);
    const [slotsError, setSlotsError] = useState<string | null>(null);

    const [assignEmail, setAssignEmail] = useState('');
    const [assignSlotLabel, setAssignSlotLabel] = useState('');
    const [assignStatus, setAssignStatus] = useState<string | null>(null);

    // --- ESTADO PARA PREVIEW DE SPONSORS (M7) ---
    const [sponsorPreview, setSponsorPreview] =
        useState<SponsorPreviewState | null>(null);
    const [sponsorLoading, setSponsorLoading] = useState(false);
    const [sponsorError, setSponsorError] = useState<string | null>(null);



    const fetchUpgradeInfo = useCallback(async () => {
        if (!email) return;
        setUpgradeLoading(true);
        setUpgradeError(null);
        setUpgradeMessage(null);

        try {
            const res = await fetch(
                `/api/ranks/upgrade?email=${encodeURIComponent(email)}`,
            );
            const json = await res.json().catch(() => ({}));

            if (!res.ok) {
                if (json.code === 'ALREADY_MAX_RANK') {
                    setUpgradeInfo(null);
                    setUpgradeError('Ya tienes el rango máximo.');
                } else {
                    setUpgradeInfo(null);
                    setUpgradeError(
                        json.error ??
                        `Error al cargar info de upgrade (${res.status})`,
                    );
                }
                return;
            }

            setUpgradeInfo({
                currentRank: json.currentRank,
                nextRank: json.nextRank,
                priceUSD: json.priceUSD,
                bonusPoints: json.bonusPoints,
            });
        } catch (err: any) {
            setUpgradeInfo(null);
            setUpgradeError(
                `Error de red cargando info de upgrade: ${err.message}`,
            );
        } finally {
            setUpgradeLoading(false);
        }
    }, [email]);

    const fetchWallet = useCallback(async () => {
        if (!email) return;
        setWalletLoading(true);
        setWalletError(null);
        setWalletMessage(null);

        try {
            const res = await fetch(
                `/api/user/wallet?email=${encodeURIComponent(email)}`,
            );
            const json = await res.json().catch(() => ({}));

            if (!res.ok || !json.ok) {
                setWalletAddress(null);
                setWalletError(json.error ?? `Error al cargar wallet (${res.status})`);
                return;
            }

            setWalletAddress(json.walletAddress ?? null);
        } catch (err: any) {
            setWalletAddress(null);
            setWalletError(
                `Error de red cargando wallet: ${err.message}`,
            );
        } finally {
            setWalletLoading(false);
        }
    }, [email]);

    // Recalcular info de upgrade cuando tengamos datos o cambie el rango
    useEffect(() => {
        if (!data?.rank || !email) return;
        fetchUpgradeInfo();
    }, [data?.rank, email, fetchUpgradeInfo]);

    // Cargar wallet al entrar
    useEffect(() => {
        if (!email) return;
        fetchWallet();
    }, [email, fetchWallet]);

    const handleGrantDevPoints = async (amount: number) => {
        if (!email) {
            alert('No se pudo determinar el email.');
            return;
        }
        try {
            const res = await fetch(
                `/api/dev/grant-points?email=${encodeURIComponent(
                    email,
                )}&amount=${amount}`,
                { method: 'POST' },
            );
            const json = await res.json().catch(() => ({}));
            if (!res.ok) {
                console.error('grant-points error', json);
                alert(`Error grant-points: ${json.error ?? res.status}`);
                return;
            }
            await reload();
        } catch (err: any) {
            console.error(err);
            alert(`Error grant-points: ${err.message}`);
        }
    };

    const handleBuyTotem = async () => {
        if (!email) {
            alert('No se pudo determinar el email.');
            return;
        }
        try {
            const res = await fetch(
                `/api/store/buy-totem?email=${encodeURIComponent(email)}`,
                { method: 'POST' },
            );
            const json = await res.json().catch(() => ({}));
            if (!res.ok) {
                console.error('buy-totem error', json);
                alert(`Error al comprar tótem: ${json.error ?? res.status}`);
                return;
            }
            await reload();
        } catch (err: any) {
            console.error(err);
            alert(`Error al comprar tótem: ${err.message}`);
        }
    };

    const handleInitDemo = async () => {
        if (!email) {
            alert('No se pudo determinar el email.');
            return;
        }
        try {
            const res = await fetch(
                `/api/counter/init-demo?email=${encodeURIComponent(
                    email,
                )}&seconds=30`,
                { method: 'POST' },
            );
            const json = await res.json().catch(() => ({}));
            if (!res.ok) {
                console.error('init-demo error', json);
                alert(`Error init-demo: ${res.status}`);
                return;
            }
            await reload();
        } catch (err: any) {
            console.error(err);
            alert(`Error init-demo: ${err.message}`);
        }
    };

    // --- HANDLERS PARA WALLET / METAMASK (vinculación) ---

    const handleLinkWalletWithMetamask = async () => {
        if (!email) {
            alert('No se pudo determinar el email.');
            return;
        }

        setWalletLoading(true);
        setWalletError(null);
        setWalletMessage(null);

        try {
            if (typeof window === 'undefined') {
                setWalletError('MetaMask no está disponible en este entorno.');
                setWalletLoading(false);
                return;
            }

            const anyWindow = window as any;
            const ethereum = anyWindow.ethereum;

            if (!ethereum) {
                setWalletError('MetaMask no está disponible en este navegador.');
                setWalletLoading(false);
                return;
            }

            const accounts: string[] = await ethereum.request({
                method: 'eth_requestAccounts',
            });

            if (!accounts || accounts.length === 0) {
                setWalletError('No se obtuvo ninguna cuenta de MetaMask.');
                setWalletLoading(false);
                return;
            }

            const account = accounts[0];
            const messageToSign = `Vincular wallet ${account} con la cuenta ${email} en ${new Date().toISOString()}`;

            const signature: string = await ethereum.request({
                method: 'personal_sign',
                params: [messageToSign, account],
            });

            const res = await fetch(
                `/api/user/wallet?email=${encodeURIComponent(email)}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        address: account,
                        message: messageToSign,
                        signature,
                    }),
                },
            );

            const json = await res.json().catch(() => ({}));

            if (!res.ok || !json.ok) {
                console.error('wallet link error', json);
                setWalletError(
                    json.error ?? `Error al vincular wallet (${res.status})`,
                );
                return;
            }

            setWalletAddress(json.walletAddress ?? null);
            setWalletMessage(`Wallet vinculada: ${json.walletAddress}`);
        } catch (err: any) {
            console.error(err);
            setWalletError(`Error MetaMask / vinculación: ${err.message}`);
        } finally {
            setWalletLoading(false);
        }
    };

    const handleUnlinkWallet = async () => {
        if (!email) {
            alert('No se pudo determinar el email.');
            return;
        }

        setWalletLoading(true);
        setWalletError(null);
        setWalletMessage(null);

        try {
            const res = await fetch(
                `/api/user/wallet?email=${encodeURIComponent(email)}`,
                { method: 'DELETE' },
            );
            const json = await res.json().catch(() => ({}));

            if (!res.ok || !json.ok) {
                console.error('wallet unlink error', json);
                setWalletError(
                    json.error ?? `Error al desvincular wallet (${res.status})`,
                );
                return;
            }

            setWalletAddress(null);
            setWalletMessage('Wallet desvinculada.');
        } catch (err: any) {
            console.error(err);
            setWalletError(`Error al desvincular wallet: ${err.message}`);
        } finally {
            setWalletLoading(false);
        }
    };

    // --- HANDLERS PARA UPGRADE DE RANGO ---

    const handleDevUpgradeRank = async () => {
        if (!email) {
            alert('No se pudo determinar el email.');
            return;
        }

        setUpgradeLoading(true);
        setUpgradeError(null);
        setUpgradeMessage(null);

        try {
            const res = await fetch(
                `/api/ranks/upgrade?email=${encodeURIComponent(email)}`,
                { method: 'POST' },
            );
            const json = await res.json().catch(() => ({}));

            if (!res.ok) {
                console.error('dev upgrade error', json);
                setUpgradeError(json.error ?? `Error upgrade DEV: ${res.status}`);
                return;
            }

            setUpgradeMessage(
                `Rango actualizado de ${json.oldRank} a ${json.newRank} (DEV sin pago).`,
            );
            await reload();
            await fetchUpgradeInfo();
        } catch (err: any) {
            console.error(err);
            setUpgradeError(`Error upgrade DEV: ${err.message}`);
        } finally {
            setUpgradeLoading(false);
        }
    };

    const handlePaypalUpgradeRank = async () => {
        if (!email) {
            alert('No se pudo determinar el email.');
            return;
        }

        setUpgradeLoading(true);
        setUpgradeError(null);
        setUpgradeMessage(null);

        try {
            const res = await fetch(
                `/api/payments/paypal/create-order?email=${encodeURIComponent(email)}`,
                { method: 'POST' },
            );
            const json = await res.json().catch(() => ({}));

            if (!res.ok || !json.approveUrl) {
                console.error('create-order error', json);
                setUpgradeError(json.error ?? 'Error al crear orden PayPal');
                setUpgradeLoading(false);
                return;
            }

            window.location.href = json.approveUrl as string;
        } catch (err: any) {
            console.error(err);
            setUpgradeError(`Error creando orden PayPal: ${err.message}`);
            setUpgradeLoading(false);
        }
    };

    const handleMetamaskOnchainUpgrade = async () => {
        if (!email) {
            alert('No se pudo determinar el email.');
            return;
        }

        if (!walletAddress) {
            setUpgradeError('Primero vincula una wallet en la sección de Wallet.');
            return;
        }

        if (!PLATFORM_ADDRESS) {
            setUpgradeError(
                'NEXT_PUBLIC_WEB3_PLATFORM_ADDRESS no está configurado.',
            );
            return;
        }

        setUpgradeLoading(true);
        setUpgradeError(null);
        setUpgradeMessage(null);

        try {
            if (typeof window === 'undefined') {
                setUpgradeError('MetaMask no está disponible en este entorno.');
                setUpgradeLoading(false);
                return;
            }

            const anyWindow = window as any;
            const ethereum = anyWindow.ethereum;

            if (!ethereum) {
                setUpgradeError('MetaMask no está disponible en este navegador.');
                setUpgradeLoading(false);
                return;
            }

            const accounts: string[] = await ethereum.request({
                method: 'eth_requestAccounts',
            });

            if (!accounts || accounts.length === 0) {
                setUpgradeError('No se obtuvo ninguna cuenta de MetaMask.');
                setUpgradeLoading(false);
                return;
            }

            const account = accounts[0].toLowerCase();

            if (account !== walletAddress.toLowerCase()) {
                setUpgradeError(
                    `La cuenta activa de MetaMask (${account}) no coincide con la wallet vinculada (${walletAddress}).`,
                );
                setUpgradeLoading(false);
                return;
            }

            const txHash: string = await ethereum.request({
                method: 'eth_sendTransaction',
                params: [
                    {
                        from: account,
                        to: PLATFORM_ADDRESS,
                        value: TEST_VALUE_HEX,
                    },
                ],
            });

            const res = await fetch(
                `/api/payments/metamask/onchain-upgrade?email=${encodeURIComponent(
                    email,
                )}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ txHash }),
                },
            );

            const json = await res.json().catch(() => ({}));

            if (!res.ok || !json.ok) {
                console.error('metamask onchain error', json);
                setUpgradeError(
                    json.error ??
                    `Error upgrade MetaMask on-chain: ${res.status}`,
                );
                return;
            }

            setUpgradeMessage(
                `MetaMask on-chain OK. Rango actualizado de ${json.oldRank} a ${json.newRank}.`,
            );

            await reload();
            await fetchUpgradeInfo();
        } catch (err: any) {
            console.error(err);
            setUpgradeError(`Error MetaMask on-chain: ${err.message}`);
        } finally {
            setUpgradeLoading(false);
        }
    };

    const handleLoadSponsorsPreview = async () => {
        if (!email) return;
        setSponsorLoading(true);
        setSponsorError(null);
        setSponsorPreview(null);

        try {
            const res = await fetch(
                `/api/dev/sponsors/preview?email=${encodeURIComponent(email)}`,
            );
            const json = await res.json().catch(() => ({}));

            if (!res.ok || !json.ok) {
                setSponsorError(
                    json.message || 'Error calculando sponsors para este usuario',
                );
                return;
            }

            const { user, results } = json as {
                user: { id: string; email: string; rank: string };
                results: SponsorPreviewItem[];
            };

            setSponsorPreview({ user, results });
        } catch (e) {
            setSponsorError('Error de red llamando a /api/dev/sponsors/preview');
        } finally {
            setSponsorLoading(false);
        }
    };


    // Calcular segundos restantes cuando cambie counterExpiresAt
    useEffect(() => {
        if (!data?.counterExpiresAt) {
            setSecondsLeft(null);
            return;
        }

        const target = new Date(data.counterExpiresAt).getTime();
        const now = Date.now();
        const diff = Math.max(0, Math.floor((target - now) / 1000));
        setSecondsLeft(diff);
    }, [data?.counterExpiresAt]);

    // Timer en cliente que baja secondsLeft cada segundo
    useEffect(() => {
        if (secondsLeft == null) return;
        let cancelled = false;

        if (secondsLeft <= 0) return;

        const id = setInterval(() => {
            if (cancelled) return;
            setSecondsLeft((prev) =>
                prev == null ? prev : Math.max(0, prev - 1),
            );
        }, 1000);

        return () => {
            cancelled = true;
            clearInterval(id);
        };
    }, [secondsLeft]);

    // Cuando llega a 0, llamar a heartbeat
    useEffect(() => {
        const runHeartbeat = async () => {
            if (!email) return;
            try {
                const res = await fetch(
                    `/api/counter/heartbeat?email=${encodeURIComponent(email)}`,
                    { method: 'POST' },
                );
                const json = await res.json().catch(() => ({}));
                if (!res.ok) {
                    console.error('heartbeat error', json);
                    setHeartbeatStatus(`Error heartbeat: ${res.status}`);
                    return;
                }
                setHeartbeatStatus(json.status ?? 'unknown');
                await reload();
            } catch (err: any) {
                console.error(err);
                setHeartbeatStatus(`Error heartbeat: ${err.message}`);
            }
        };

        if (secondsLeft === 0) {
            runHeartbeat();
        }
    }, [secondsLeft, email, reload]);


    // Cargar slots al entrar al panel
    useEffect(() => {
        void loadSlots();
    }, []);

    async function loadSlots() {
        try {
            setSlotsLoading(true);
            setSlotsError(null);

            const res = await fetch('/api/dev/slots/tree?maxLevel=4');
            const json = await res.json().catch(() => ({}));

            if (!res.ok || !json.ok) {
                throw new Error(json.error ?? `Error slots: ${res.status}`);
            }

            const items: SlotTreeItem[] = (json.slots as any[]).map((s) => ({
                id: s.id,
                label: s.label ?? null,
                level: s.level,
                position: s.position,
                parentId: s.parentId ?? null,
                ownerType: s.ownerType,
                ownerUserEmail: s.ownerUser?.email ?? null,
                ownerUserRank: s.ownerUser?.rank ?? null,
            }));

            setSlots(items);
        } catch (err: any) {
            console.error(err);
            setSlotsError(err.message ?? 'Error cargando slots');
        } finally {
            setSlotsLoading(false);
        }
    }

    async function handleInitSlots() {
        try {
            setSlotsLoading(true);
            setSlotsError(null);

            const res = await fetch('/api/dev/init-slots', {
                method: 'POST',
            });
            const json = await res.json().catch(() => ({}));

            if (!res.ok || !json.ok) {
                throw new Error(json.error ?? `Error init-slots: ${res.status}`);
            }

            await loadSlots();
        } catch (err: any) {
            console.error(err);
            setSlotsError(err.message ?? 'Error inicializando árbol');
        } finally {
            setSlotsLoading(false);
        }
    }

    async function handleAssignSlot(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setAssignStatus(null);

        const emailValue = assignEmail.trim().toLowerCase();
        const labelValue = assignSlotLabel.trim().toUpperCase();

        if (!emailValue || !labelValue) {
            setAssignStatus('Debes indicar email y etiqueta de slot.');
            return;
        }

        try {
            const res = await fetch('/api/dev/slots/assign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: emailValue,
                    slotLabel: labelValue,
                }),
            });

            const json = await res.json().catch(() => ({}));

            if (!res.ok || !json.ok) {
                setAssignStatus(
                    json.error
                        ? `Error asignando slot: ${json.error}`
                        : `Error asignando slot (${res.status})`,
                );
                return;
            }

            setAssignStatus(`Slot ${labelValue} asignado a ${emailValue}.`);
            setAssignEmail('');
            setAssignSlotLabel('');

            await loadSlots();
        } catch (err: any) {
            console.error(err);
            setAssignStatus(err.message ?? 'Error desconocido asignando slot');
        }
    }

    const slotsByLevel = useMemo(() => {
        const grouped = new Map<number, SlotTreeItem[]>();

        for (const s of slots) {
            const list = grouped.get(s.level) ?? [];
            list.push(s);
            grouped.set(s.level, list);
        }

        const result: { level: number; slots: SlotTreeItem[] }[] = [];
        for (const [level, list] of grouped.entries()) {
            result.push({
                level,
                slots: list.slice().sort((a, b) => a.position - b.position),
            });
        }

        result.sort((a, b) => a.level - b.level);
        return result;
    }, [slots]);

    const formattedTimer =
        secondsLeft == null
            ? 'Sin contador'
            : `${Math.floor(secondsLeft / 60)
                .toString()
                .padStart(2, '0')}:${(secondsLeft % 60)
                    .toString()
                    .padStart(2, '0')}`;

    function getOwnerLabel(slot: SlotTreeItem) {
        if (slot.ownerType === 'PLATFORM') return 'PLATFORM';
        if (slot.ownerType === 'VACANT') return 'VACANT';
        return slot.ownerUserEmail ?? 'USER';
    }

    if (loading) {
        return <div className="p-4">Cargando panel...</div>;
    }

    if (error || !data) {
        return (
            <div className="p-4 text-red-600">
                <p className="font-semibold">Error cargando panel:</p>
                <p>{error ?? 'Sin datos'}</p>
            </div>
        );
    }

    return (
        <main className="p-6 space-y-4">
            <h1 className="text-2xl font-bold">Panel de control (BD real)</h1>

            {/* Estado del usuario */}
            <section className="border rounded p-4 space-y-1">
                <p>
                    <strong>Email:</strong> {data.email}
                </p>
                <p>
                    <strong>Rango:</strong> {data.rank}
                </p>
                <p>
                    <strong>Puntos:</strong> {data.points}
                </p>
                <p>
                    <strong>Tótems:</strong> {data.totems}
                </p>
                <p>
                    <strong>Suspensión:</strong> {data.isSuspended ? 'Sí' : 'No'}
                </p>
                <p>
                    <strong>CounterExpiresAt:</strong>{' '}
                    {data.counterExpiresAt ?? 'sin definir'}
                </p>
            </section>

            {/* Temporizador */}
            <section className="border rounded p-4 space-y-2">
                <h2 className="font-semibold">Temporizador</h2>
                <p>
                    <strong>Tiempo restante:</strong> {formattedTimer}
                </p>
                {heartbeatStatus && (
                    <p className="text-sm text-gray-600">
                        Último heartbeat: {heartbeatStatus}
                    </p>
                )}
                <button
                    onClick={handleInitDemo}
                    className="border px-3 py-1 rounded mt-2"
                >
                    Iniciar temporizador demo (30s)
                </button>
            </section>

            {/* Tienda rápida */}
            <section className="border rounded p-4 space-y-2">
                <h2 className="font-semibold">Tienda rápida (BD real)</h2>
                <p>
                    <strong>Costo de 1 tótem:</strong> {ECONOMY.costs.totem} puntos
                </p>
                <p>
                    <strong>Límite de tótems:</strong> {ECONOMY.maxTotems}
                </p>
                <p>
                    <strong>Tótems actuales:</strong> {data.totems}
                </p>
                <p>
                    <strong>Puntos actuales:</strong> {data.points}
                </p>

                <div className="flex flex-wrap gap-2 mt-2">
                    {IS_DEV && (
                        <button
                            onClick={() => handleGrantDevPoints(500)}
                            className="border px-3 py-1 rounded text-sm"
                        >
                            +500 puntos (DEV)
                        </button>
                    )}
                    <button
                        onClick={handleBuyTotem}
                        className="border px-3 py-1 rounded text-sm"
                        disabled={
                            data.points < ECONOMY.costs.totem ||
                            data.totems >= ECONOMY.maxTotems
                        }
                    >
                        Comprar 1 tótem
                    </button>
                </div>
            </section>

            {/* Historial de pagos y upgrades */}
            <section className="border rounded p-4 space-y-3">
                <h2 className="font-semibold">Historial de pagos y upgrades</h2>

                {historyLoading && (
                    <p className="text-sm text-gray-600">
                        Cargando historial...
                    </p>
                )}

                {historyError && (
                    <p className="text-sm text-red-600">
                        Error al cargar historial: {historyError}
                    </p>
                )}

                {!historyLoading && !historyError && history && (
                    <div className="space-y-4">
                        <div>
                            <h3 className="font-semibold text-sm mb-1">
                                Últimos pagos
                            </h3>
                            {history.payments.length === 0 ? (
                                <p className="text-sm text-gray-500">
                                    Sin pagos registrados.
                                </p>
                            ) : (
                                <ul className="text-sm space-y-1">
                                    {history.payments.map((p) => (
                                        <li key={p.id}>
                                            <span className="font-mono">
                                                {new Date(
                                                    p.createdAt,
                                                ).toLocaleString()}
                                            </span>{' '}
                                            — {p.method} ({p.provider}) —{' '}
                                            {p.amount} {p.currency} —{' '}
                                            <span className="uppercase">
                                                {p.status}
                                            </span>{' '}
                                            {p.purpose && (
                                                <span>
                                                    — {p.purpose}
                                                </span>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        <div>
                            <h3 className="font-semibold text-sm mb-1">
                                Últimos upgrades de rango
                            </h3>
                            {history.upgrades.length === 0 ? (
                                <p className="text-sm text-gray-500">
                                    Sin upgrades registrados.
                                </p>
                            ) : (
                                <ul className="text-sm space-y-1">
                                    {history.upgrades.map((u) => (
                                        <li key={u.id}>
                                            <span className="font-mono">
                                                {new Date(
                                                    u.createdAt,
                                                ).toLocaleString()}
                                            </span>{' '}
                                            — {u.fromRank} →{' '}
                                            <strong>{u.toRank}</strong> (
                                            {u.provider})
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                )}
            </section>


            {/* Wallet / MetaMask */}
            <section className="border rounded p-4 space-y-2">
                <h2 className="font-semibold">Wallet (MetaMask)</h2>
                <p className="text-sm text-gray-600">
                    Vincular una wallet permitirá validar pagos on-chain.
                </p>
                <p>
                    <strong>Wallet vinculada:</strong>{' '}
                    {walletAddress ?? 'Ninguna'}
                </p>
                {walletLoading && (
                    <p className="text-sm text-gray-600">Procesando...</p>
                )}
                <div className="flex flex-wrap gap-2 mt-2">
                    <button
                        onClick={handleLinkWalletWithMetamask}
                        className="border px-3 py-1 rounded text-sm"
                        disabled={walletLoading}
                    >
                        Vincular con MetaMask
                    </button>
                    {walletAddress && (
                        <button
                            onClick={handleUnlinkWallet}
                            className="border px-3 py-1 rounded text-sm"
                            disabled={walletLoading}
                        >
                            Desvincular wallet
                        </button>
                    )}
                </div>
                {walletError && (
                    <p className="text-sm text-red-600 mt-1">{walletError}</p>
                )}
                {walletMessage && (
                    <p className="text-sm text-green-600 mt-1">{walletMessage}</p>
                )}
            </section>

            {/* M7 – Previsualización de sponsors por tier */}
            {IS_DEV && (
                <section className="border rounded p-4 space-y-2">
                    <h2 className="font-semibold">
                        M7 – Previsualización de sponsors (árbol de slots)
                    </h2>
                    <p className="text-sm text-gray-600">
                        Calcula quién cobraría cada tier (3, 5, 10, 50, 400, 6000)
                        según el árbol de slots actual para este usuario.
                    </p>

                    <button
                        onClick={handleLoadSponsorsPreview}
                        className="border px-3 py-1 rounded text-sm"
                        disabled={sponsorLoading || !email}
                    >
                        {sponsorLoading
                            ? 'Calculando...'
                            : 'Calcular sponsors para este usuario'}
                    </button>

                    {sponsorError && (
                        <p className="text-sm text-red-600 mt-1">
                            {sponsorError}
                        </p>
                    )}

                    {sponsorPreview && (
                        <div className="mt-3 space-y-2">
                            <p className="text-sm">
                                Usuario:{' '}
                                <span className="font-mono">
                                    {sponsorPreview.user.email}
                                </span>{' '}
                                (rango {sponsorPreview.user.rank})
                            </p>

                            <div className="overflow-x-auto">
                                <table className="w-full text-xs border">
                                    <thead>
                                        <tr className="bg-gray-100">
                                            <th className="border px-2 py-1">
                                                Tier
                                            </th>
                                            <th className="border px-2 py-1">
                                                Monto (USD)
                                            </th>
                                            <th className="border px-2 py-1">
                                                Niveles arriba (r+1)
                                            </th>
                                            <th className="border px-2 py-1">
                                                Tipo receptor
                                            </th>
                                            <th className="border px-2 py-1">
                                                Slot receptor
                                            </th>
                                            <th className="border px-2 py-1">
                                                Usuario receptor
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sponsorPreview.results.map((item, idx) => {
                                            if (!item.ok) {
                                                return (
                                                    <tr key={idx} className="bg-red-50">
                                                        <td className="border px-2 py-1">
                                                            {item.tier ?? '-'}
                                                        </td>
                                                        <td
                                                            className="border px-2 py-1"
                                                            colSpan={5}
                                                        >
                                                            {item.code}:{' '}
                                                            {item.message}
                                                        </td>
                                                    </tr>
                                                );
                                            }

                                            const receiverLabel =
                                                item.receiverType === 'platform'
                                                    ? 'Plataforma'
                                                    : item.receiverUserEmail ??
                                                    'User sin email';

                                            const receiverRank =
                                                item.receiverUserRank ?? '';

                                            return (
                                                <tr key={idx}>
                                                    <td className="border px-2 py-1">
                                                        {item.tier}
                                                    </td>
                                                    <td className="border px-2 py-1 text-right">
                                                        {item.amountUSD}
                                                    </td>
                                                    <td className="border px-2 py-1 text-center">
                                                        {item.distanceLevels}
                                                    </td>
                                                    <td className="border px-2 py-1">
                                                        {item.receiverType}
                                                    </td>
                                                    <td className="border px-2 py-1">
                                                        {item.receiverSlotLabel ??
                                                            '(sin label)'}
                                                    </td>
                                                    <td className="border px-2 py-1">
                                                        {receiverLabel}{' '}
                                                        {receiverRank &&
                                                            `(${receiverRank})`}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </section>
            )}


            {/* Upgrade de rango */}
            <section className="border rounded p-4 space-y-2">
                <h2 className="font-semibold">Upgrade de rango (BD real)</h2>
                <p>
                    <strong>Rango actual (dashboard):</strong> {data.rank}
                </p>

                {upgradeLoading && (
                    <p className="text-sm text-gray-600">Procesando...</p>
                )}

                {upgradeInfo ? (
                    <>
                        <p>
                            <strong>Siguiente rango:</strong> {upgradeInfo.nextRank}
                        </p>
                        <p>
                            <strong>Precio:</strong> {upgradeInfo.priceUSD} USD
                        </p>
                        <p>
                            <strong>Bono de puntos al subir:</strong>{' '}
                            {upgradeInfo.bonusPoints}
                        </p>
                    </>
                ) : (
                    <p className="text-sm text-gray-500">
                        {upgradeError ?? 'No hay información de upgrade disponible.'}
                    </p>
                )}

                <div className="flex flex-wrap gap-2 mt-2">
                    {IS_DEV && (
                        <button
                            onClick={handleDevUpgradeRank}
                            className="border px-3 py-1 rounded text-sm"
                            disabled={upgradeLoading || !upgradeInfo}
                        >
                            Subir rango (DEV sin pago)
                        </button>
                    )}
                    <button
                        onClick={handlePaypalUpgradeRank}
                        className="border px-3 py-1 rounded text-sm"
                        disabled={upgradeLoading || !upgradeInfo}
                    >
                        Subir con PayPal (sandbox)
                    </button>
                    {IS_DEV && (
                        <button
                            onClick={handleMetamaskOnchainUpgrade}
                            className="border px-3 py-1 rounded text-sm"
                            disabled={upgradeLoading || !upgradeInfo}
                        >
                            Subir con MetaMask (on-chain testnet)
                        </button>
                    )}
                </div>

                {upgradeError && (
                    <p className="text-sm text-red-600 mt-1">{upgradeError}</p>
                )}
                {upgradeMessage && (
                    <p className="text-sm text-green-600 mt-1">{upgradeMessage}</p>
                )}
            </section>

            {/* Árbol de slots (LAB – M6) */}
            <section className="border rounded p-4 space-y-3">
                <h2 className="font-semibold">Árbol de slots (LAB)</h2>

                <div className="flex flex-wrap gap-2 mb-2">
                    <button
                        type="button"
                        onClick={handleInitSlots}
                        className="px-3 py-1 text-sm rounded bg-slate-800 hover:bg-slate-700"
                        disabled={slotsLoading}
                    >
                        Inicializar árbol base
                    </button>

                    <button
                        type="button"
                        onClick={loadSlots}
                        className="px-3 py-1 text-sm rounded bg-slate-800 hover:bg-slate-700"
                        disabled={slotsLoading}
                    >
                        Recargar árbol
                    </button>
                </div>

                {slotsError && (
                    <p className="text-sm text-red-500">
                        Error árbol: {slotsError}
                    </p>
                )}

                <form
                    onSubmit={handleAssignSlot}
                    className="flex flex-wrap gap-2 items-center mb-3"
                >
                    <input
                        type="email"
                        placeholder="Email del usuario"
                        value={assignEmail}
                        onChange={(e) => setAssignEmail(e.target.value)}
                        className="px-2 py-1 text-sm rounded bg-slate-900 border border-slate-700"
                    />
                    <input
                        type="text"
                        placeholder="Etiqueta de slot (ej: G, H, P)"
                        value={assignSlotLabel}
                        onChange={(e) => setAssignSlotLabel(e.target.value)}
                        className="px-2 py-1 text-sm rounded bg-slate-900 border border-slate-700"
                    />
                    <button
                        type="submit"
                        className="px-3 py-1 text-sm rounded bg-emerald-700 hover:bg-emerald-600"
                    >
                        Asignar slot
                    </button>
                    {assignStatus && (
                        <span className="text-xs text-slate-300 ml-2">
                            {assignStatus}
                        </span>
                    )}
                </form>

                {slotsLoading && (
                    <p className="text-sm text-slate-300">Cargando árbol…</p>
                )}

                {!slotsLoading && slotsByLevel.length === 0 && (
                    <p className="text-sm text-slate-300">
                        No hay slots creados todavía. Pulsa "Inicializar árbol base".
                    </p>
                )}

                {!slotsLoading &&
                    slotsByLevel.map(({ level, slots }) => (
                        <div key={level} className="mb-3">
                            <h3 className="text-sm font-semibold mb-1">
                                Nivel {level}
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {slots.map((slot) => (
                                    <div
                                        key={slot.id}
                                        className="px-2 py-1 rounded border border-slate-700 text-xs"
                                    >
                                        <div className="font-mono">
                                            {slot.label ?? slot.id.slice(0, 4)}
                                        </div>
                                        <div className="text-slate-300">
                                            owner: {getOwnerLabel(slot)}
                                        </div>
                                        {slot.ownerType === 'USER' && slot.ownerUserRank && (
                                            <div className="text-slate-400">
                                                rango: {slot.ownerUserRank}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
            </section>

        </main>
    );
}
