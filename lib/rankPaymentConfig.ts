// lib/rankPaymentConfig.ts

// Para modo laboratorio: todos los upgrades exigen 0.001 ETH.
// Cuando quieras ponerte serio, ajustas estos valores.
export const METAMASK_MIN_WEI_BY_NEXT_RANK: Record<string, string> = {
    invitado: '1000000000000000',  // 0.001 ETH
    miembro: '1000000000000000',   // 0.001 ETH
    vip: '1000000000000000',       // 0.001 ETH
    premium: '1000000000000000',   // 0.001 ETH
    elite: '1000000000000000',     // 0.001 ETH
};
