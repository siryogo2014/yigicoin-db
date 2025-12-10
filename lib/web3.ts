// lib/web3.ts

// RPC por defecto: Sepolia pública estable
const DEFAULT_RPC_URL = 'https://ethereum-sepolia-rpc.publicnode.com';

const RPC_URL = process.env.WEB3_RPC_URL || DEFAULT_RPC_URL;
const PLATFORM_ADDRESS = process.env.WEB3_PLATFORM_ADDRESS
    ? process.env.WEB3_PLATFORM_ADDRESS.toLowerCase()
    : undefined;
const MIN_WEI = process.env.WEB3_MIN_WEI
    ? BigInt(process.env.WEB3_MIN_WEI)
    : BigInt(0);

export type TxStatus = 'success' | 'failed' | 'pending';

export type TxInfo = {
    from: string;
    to: string | null;
    value: bigint;
    status: TxStatus;
};

async function rpcCall(method: string, params: any[]): Promise<any> {
    if (!RPC_URL) {
        throw new Error('WEB3_RPC_URL not configured');
    }

    const res = await fetch(RPC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method,
            params,
        }),
    });

    if (!res.ok) {
        throw new Error(`RPC_HTTP_${res.status}`);
    }

    const json = await res.json();
    if (json.error) {
        throw new Error(`RPC_ERROR_${json.error.message ?? 'unknown'}`);
    }
    return json.result;
}

// Convierte hex "0x..." a bigint
function hexToBigInt(hex: string | null | undefined): bigint {
    if (!hex) return BigInt(0);
    return BigInt(hex);
}

// Espera hasta que haya receipt o se agoten los intentos
async function waitForReceipt(
    txHash: string,
    maxAttempts = 10,
    delayMs = 3000
): Promise<any | null> {
    for (let i = 0; i < maxAttempts; i++) {
        const receipt = await rpcCall('eth_getTransactionReceipt', [txHash]);
        if (receipt) return receipt;
        await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
    return null;
}

export async function getTransactionInfo(txHash: string): Promise<TxInfo> {
    const tx = await rpcCall('eth_getTransactionByHash', [txHash]);

    if (!tx) {
        throw new Error('TRANSACTION_NOT_FOUND');
    }

    const receipt = await waitForReceipt(txHash); // <- aquí esperamos

    let status: TxStatus = 'pending';
    if (receipt?.status === '0x1') status = 'success';
    else if (receipt?.status === '0x0') status = 'failed';

    return {
        from: (tx.from as string).toLowerCase(),
        to: tx.to ? (tx.to as string).toLowerCase() : null,
        value: hexToBigInt(tx.value as string),
        status,
    };
}

export const WEB3_CONFIG = {
    rpcUrl: RPC_URL,
    platformAddress: PLATFORM_ADDRESS,
    minWei: MIN_WEI,
};
