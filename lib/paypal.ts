// lib/paypal.ts
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;
const PAYPAL_API_BASE = process.env.PAYPAL_API_BASE ?? 'https://api-m.sandbox.paypal.com';

if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
    // Si quieres que el proyecto arranque sin PayPal, quita este throw y valida dentro de cada función.
    throw new Error('Faltan PAYPAL_CLIENT_ID o PAYPAL_CLIENT_SECRET en el entorno');
}

async function getAccessToken(): Promise<string> {
    const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');

    const res = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
    });

    if (!res.ok) {
        const text = await res.text();
        console.error('PayPal getAccessToken error:', text);
        throw new Error('PAYPAL_AUTH_FAILED');
    }

    const data = (await res.json()) as { access_token: string };
    return data.access_token;
}

export async function createPaypalOrder(args: {
    amount: string;
    currency: 'USD';
    description: string;
    returnUrl: string;
    cancelUrl: string;
}) {
    const token = await getAccessToken();

    const res = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            intent: 'CAPTURE',
            purchase_units: [
                {
                    amount: {
                        currency_code: args.currency,
                        value: args.amount,
                    },
                    description: args.description,
                },
            ],
            application_context: {
                return_url: args.returnUrl,
                cancel_url: args.cancelUrl,
            },
        }),
    });

    const data = await res.json();
    if (!res.ok) {
        console.error('PayPal create order error:', data);
        throw new Error('PAYPAL_CREATE_ORDER_FAILED');
    }

    return data;
}

export async function capturePaypalOrder(orderId: string) {
    const token = await getAccessToken();

    const res = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}/capture`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    });

    const data = await res.json();
    if (!res.ok) {
        console.error('PayPal capture error:', data);
        throw new Error('PAYPAL_CAPTURE_FAILED');
    }

    return data;
}
