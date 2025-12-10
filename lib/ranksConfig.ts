// lib/ranksConfig.ts

export type Rank = 'registrado' | 'invitado' | 'miembro' | 'vip' | 'premium' | 'elite';

export type RankConfig = {
    rank: Rank;
    label: string;
    /** Precio para COMPRAR este rango desde el anterior (USD) */
    priceUSD: number;
    /** Bono de puntos al alcanzar este rango (una sola vez) */
    upgradeBonusPoints: number;
    order: number; // para determinar siguiente/anterior
};

export const RANKS_CONFIG: RankConfig[] = [
    { rank: 'registrado', label: 'Registrado', priceUSD: 0, upgradeBonusPoints: 0, order: 0 },
    { rank: 'invitado', label: 'Invitado', priceUSD: 5, upgradeBonusPoints: 10, order: 1 },
    { rank: 'miembro', label: 'Miembro', priceUSD: 10, upgradeBonusPoints: 30, order: 2 },
    { rank: 'vip', label: 'VIP', priceUSD: 50, upgradeBonusPoints: 100, order: 3 },
    { rank: 'premium', label: 'Premium', priceUSD: 400, upgradeBonusPoints: 250, order: 4 },
    { rank: 'elite', label: 'Élite', priceUSD: 6000, upgradeBonusPoints: 400, order: 5 },
];

const configByRank: Record<Rank, RankConfig> = RANKS_CONFIG.reduce((map, cfg) => {
    map[cfg.rank] = cfg;
    return map;
}, {} as Record<Rank, RankConfig>);

export function getRankConfig(rank: Rank): RankConfig {
    const cfg = configByRank[rank];
    if (!cfg) {
        throw new Error(`Unknown rank: ${rank}`);
    }
    return cfg;
}

export type UpgradeInfo = {
    currentRank: Rank;
    nextRank: Rank;
    priceUSD: number;
    bonusPoints: number;
};

export function getUpgradeInfoForRank(currentRank: Rank): UpgradeInfo | null {
    const currentCfg = getRankConfig(currentRank);
    const nextOrder = currentCfg.order + 1;
    const nextCfg = RANKS_CONFIG.find((r) => r.order === nextOrder);
    if (!nextCfg) return null;

    return {
        currentRank,
        nextRank: nextCfg.rank,
        priceUSD: nextCfg.priceUSD,
        bonusPoints: nextCfg.upgradeBonusPoints,
    };
}
