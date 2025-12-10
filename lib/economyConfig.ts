/**
 * YigiCoin Economy Configuration
 * Centralizes all economy-related constants, costs, caps, and helper functions
 */

export type UserRank =
  | 'registrado'
  | 'invitado'
  | 'miembro'
  | 'vip'
  | 'premium'
  | 'elite';

// Main economy configuration
export const ECONOMY = {
  // Ad viewing configuration
  ads: {
    adViewSeconds: 10,
    pointsPerAd: 2,
    freqCapHours: 24, // per advertiser
    adsEnabledFrom: 'invitado' as UserRank,
    // Daily ad caps per rank
    dailyAdCaps: {
      registrado: 0,
      invitado: 30,
      miembro: 45,
      vip: 60,
      premium: 80,
      elite: 100,
    },
    // House ads (1 point, max 5/day - only for ranks with ads enabled)
    houseAds: {
      pointsPerView: 1,
      maxPerDay: 5,
    },
  },

  // Rank upgrade bonuses (one-time bonus when upgrading to each rank)
  rankBonuses: {
    registrado: 0,
    invitado: 10,
    miembro: 30,
    vip: 100,
    premium: 250,
    elite: 400,
  },

  // Costs for various actions
  costs: {
    refreshCounter: 40,
    raffleWeekly: 200,
    raffleMonthly: 800,
    totem: 100, // Changed to 100 as per new requirements
  },

  // Refresh button eligibility configuration
  // Buttons will be enabled when timer <= this value (in seconds)
  refreshButtonEligibility: {
    timeGrantedByLevel: 300, // 5 minutes in seconds - configurable time threshold
  },

  // Ad packages purchase (with points)
  adPackages: [
    {
      id: 'visits_500',
      visits: 500,
      costPoints: 100,
    },
    {
      id: 'visits_1000',
      visits: 1000,
      costPoints: 200,
    },
    {
      id: 'visits_2500',
      visits: 2500,
      costPoints: 500,
    },
  ],

  // Counter duration per rank (in SECONDS for testing, will display as hours in UI)
  // These are the ceiling values for each rank
  counterSeconds: {
    registrado: 168, // 168 segundos para pruebas
    invitado: 72,    // 72 segundos
    miembro: 84,     // 84 segundos
    vip: 96,         // 96 segundos
    premium: 120,    // 120 segundos
    elite: 168,      // 168 segundos
  },

  // Refresh button configuration
  refreshButton: {
    cost: 40,              // Cost in points
    timeAddedSeconds: 48,  // +48 seconds when refreshing
  },

  // Counter duration per rank (in hours) - DEPRECATED, use counterSeconds instead
  /* counterHours is ignored by counterMsForRank (fixed 5 min) */
  counterHours: {
    registrado: 168, // 7 days
    invitado: 72,    // 3 days
    miembro: 72,
    vip: 84,
    premium: 96,
    elite: 120,
  },

  // Base totems per rank (starting amount)
  baseTotems: {
    registrado: 0,
    invitado: 0,
    miembro: 0,
    vip: 1,
    premium: 2,
    elite: 2, // Changed from 4 to 2 as per requirements
  },

  // Maximum totems a user can have (purchased + rank-based)
  maxTotems: 5,
} as const;

/**
 * Get counter duration in SECONDS for a given rank (ceiling value)
 * @param rank - User rank
 * @returns Duration in seconds
 */
export function counterSecondsForRank(rank: UserRank): number {
  return ECONOMY.counterSeconds[rank] || ECONOMY.counterSeconds.registrado;
}

/**
 * Get counter duration in milliseconds for a given rank
 * @param rank - User rank
 * @returns Duration in milliseconds
 * @deprecated Use counterSecondsForRank instead
 */
export function counterMsForRank(rank: UserRank): number {
  return counterSecondsForRank(rank) * 1000;
}

/**
 * Format milliseconds to Days/Hours/Minutes/Seconds string
 * @param ms - Milliseconds to format
 * @returns Formatted string (e.g., "2d 5h 30m 15s")
 */
export function formatDHMS(ms: number): string {
  if (ms <= 0) return '0s';

  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  const d = days;
  const h = hours % 24;
  const m = minutes % 60;
  const s = seconds % 60;

  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  if (s > 0 || parts.length === 0) parts.push(`${s}s`);

  return parts.join(' ');
}

/**
 * Format milliseconds to a human-readable time string (Spanish)
 * @param ms - Milliseconds to format
 * @returns Formatted string in Spanish (e.g., "2 días 5 horas")
 */
export function formatTimeSpanish(ms: number): string {
  if (ms <= 0) return '0 segundos';

  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days} ${days === 1 ? 'día' : 'días'}`);
  if (hours % 24 > 0) parts.push(`${hours % 24} ${hours % 24 === 1 ? 'hora' : 'horas'}`);
  if (minutes % 60 > 0 && days === 0) parts.push(`${minutes % 60} ${minutes % 60 === 1 ? 'minuto' : 'minutos'}`);
  if (seconds % 60 > 0 && days === 0 && hours === 0) parts.push(`${seconds % 60} ${seconds % 60 === 1 ? 'segundo' : 'segundos'}`);

  return parts.join(' ');
}

/**
 * Format seconds to display as "hours" in UI (for testing purposes)
 * Internally uses seconds but displays as if they were hours
 * @param seconds - Seconds to format
 * @returns Formatted string showing "horas" (e.g., "48 horas")
 */
export function formatSecondsAsHours(seconds: number): string {
  if (seconds <= 0) return '0 horas';
  
  const hourValue = Math.floor(seconds);
  return `${hourValue} ${hourValue === 1 ? 'hora' : 'horas'}`;
}

/**
 * Check if ads are enabled for a given rank
 * @param rank - User rank to check
 * @returns True if the rank can see ads
 */
export function canSeeAds(rank: UserRank): boolean {
  const rankOrder: UserRank[] = ['registrado', 'invitado', 'miembro', 'vip', 'premium', 'elite'];
  const userRankIndex = rankOrder.indexOf(rank);
  const enabledFromIndex = rankOrder.indexOf(ECONOMY.ads.adsEnabledFrom);

  return userRankIndex >= enabledFromIndex;
}

/**
 * Get daily ad cap for a given rank
 * @param rank - User rank
 * @returns Maximum number of ads per day
 */
export function getDailyAdCap(rank: UserRank): number {
  return ECONOMY.ads.dailyAdCaps[rank] || 0;
}

/**
 * Get base totems for a given rank
 * @param rank - User rank
 * @returns Number of base totems
 */
export function getBaseTotems(rank: UserRank): number {
  return ECONOMY.baseTotems[rank] || 0;
}

/**
 * Get rank bonus points for upgrading to a rank
 * @param rank - Target rank
 * @returns Bonus points awarded
 */
export function getRankBonus(rank: UserRank): number {
  return ECONOMY.rankBonuses[rank] || 0;
}

/**
 * Check if a rank has access to the store (Tienda)
 * @param rank - User rank
 * @returns True if the rank can access the store
 */
export function canAccessStore(rank: UserRank): boolean {
  // Store is available from 'invitado' rank onwards
  const rankOrder: UserRank[] = ['registrado', 'invitado', 'miembro', 'vip', 'premium', 'elite'];
  const userRankIndex = rankOrder.indexOf(rank);
  const storeFromIndex = rankOrder.indexOf('invitado');

  return userRankIndex >= storeFromIndex;
}

/**
 * Check if a rank has access to the lottery (Lotería)
 * @param rank - User rank
 * @returns True if the rank can access the lottery
 */
export function canAccessLottery(rank: UserRank): boolean {
  // Lottery is available from 'invitado' rank onwards
  const rankOrder: UserRank[] = ['registrado', 'invitado', 'miembro', 'vip', 'premium', 'elite'];
  const userRankIndex = rankOrder.indexOf(rank);
  const lotteryFromIndex = rankOrder.indexOf('invitado');

  return userRankIndex >= lotteryFromIndex;
}

/**
 * Check if user has sufficient points for a purchase
 * @param currentPoints - User's current points
 * @param cost - Cost of the item
 * @returns True if user can afford the purchase
 */
export function canAfford(currentPoints: number, cost: number): boolean {
  return currentPoints >= cost;
}

/**
 * Calculate remaining milliseconds until counter expires
 * @param counterExpiresAt - Expiration timestamp
 * @returns Remaining milliseconds (0 if expired)
 */
export function getRemainingMs(counterExpiresAt: Date | null): number {
  if (!counterExpiresAt) return 0;
  const remaining = new Date(counterExpiresAt).getTime() - Date.now();
  return Math.max(0, remaining);
}

/**
 * Check if counter has expired
 * @param counterExpiresAt - Expiration timestamp
 * @returns True if counter has expired
 */
export function isCounterExpired(counterExpiresAt: Date | null): boolean {
  return getRemainingMs(counterExpiresAt) === 0;
}

/**
 * Get rank order index for comparisons
 * @param rank - User rank
 * @returns Index in rank hierarchy (0-5)
 */
export function getRankIndex(rank: UserRank): number {
  const rankOrder: UserRank[] = ['registrado', 'invitado', 'miembro', 'vip', 'premium', 'elite'];
  return rankOrder.indexOf(rank);
}

/**
 * Compare two ranks
 * @param rank1 - First rank
 * @param rank2 - Second rank
 * @returns Negative if rank1 < rank2, 0 if equal, positive if rank1 > rank2
 */
export function compareRanks(rank1: UserRank, rank2: UserRank): number {
  return getRankIndex(rank1) - getRankIndex(rank2);
}

/**
 * Store items configuration
 */
export const STORE_ITEMS = {
  totem: {
    id: 'totem',
    name: 'Tótem Digital',
    description: 'Vida extra para evitar suspensión cuando el contador expire',
    pricePoints: ECONOMY.costs.totem,
    icon: '🗿',
  },
  adPackages: ECONOMY.adPackages.map((pkg) => ({
    id: pkg.id,
    name: `Paquete de ${pkg.visits} Visitas`,
    description: `${pkg.visits.toLocaleString()} visitas para tus campañas publicitarias`,
    pricePoints: pkg.costPoints,
    visits: pkg.visits,
    icon: '📢',
  })),
} as const;

/**
 * Lottery configuration (OLD - to be removed)
 */
export const LOTTERY_CONFIG = {
  weekly: {
    id: 'weekly',
    name: 'Sorteo Semanal',
    cost: ECONOMY.costs.raffleWeekly,
    description: 'Participa en el sorteo semanal',
  },
  monthly: {
    id: 'monthly',
    name: 'Sorteo Mensual',
    cost: ECONOMY.costs.raffleMonthly,
    description: 'Participa en el sorteo mensual con mayores premios',
  },
} as const;

/**
 * Nueva configuración de SORTEOS (pago con puntos)
 * Disponible desde rango Invitado en adelante
 */
export const RAFFLE_CONFIG = {
  weekly: {
    id: 'raffle_weekly',
    name: 'Sorteo Semanal',
    description: 'Gana 20 USD con puntos',
    prizeAmount: 20, // USD
    ticketCostPoints: 100,
    minRank: 'invitado' as UserRank,
    drawDay: 5, // Viernes (0=Domingo, 5=Viernes)
    drawHour: 0, // 00:00
    icon: '🎁',
    color: 'blue',
  },
  monthly: {
    id: 'raffle_monthly',
    name: 'Sorteo Mensual',
    description: 'Gana 100 USD con puntos',
    prizeAmount: 100, // USD
    ticketCostPoints: 300,
    minRank: 'invitado' as UserRank,
    drawDay: 5, // Viernes (último del mes)
    drawHour: 0, // 00:00
    icon: '💎',
    color: 'purple',
  },
} as const;

/**
 * Nueva configuración de LOTERÍA NORMAL (pago con Metamask)
 * Disponible desde rango Miembro (miembro) en adelante
 */
export const LOTTERY_NORMAL_CONFIG = {
  weekly: {
    id: 'lottery_weekly',
    name: 'Lotería Semanal',
    description: 'Premio de 100 USD',
    prizeAmount: 100, // USD
    ticketCostUSD: 2,
    minRank: 'miembro' as UserRank,
    drawDay: 5, // Viernes
    drawHour: 0, // 00:00
    icon: '🎲',
    color: 'green',
  },
  monthly: {
    id: 'lottery_monthly',
    name: 'Lotería Mensual',
    description: 'Premio de 5,000 USD',
    prizeAmount: 5000, // USD
    ticketCostUSD: 80,
    minRank: 'miembro' as UserRank,
    drawDay: 5, // Viernes (último del mes)
    drawHour: 0, // 00:00
    icon: '💰',
    color: 'emerald',
  },
} as const;

/**
 * Nueva configuración de LOTERÍA VIP (pago con Metamask)
 * Disponible desde rango VIP en adelante
 */
export const LOTTERY_VIP_CONFIG = {
  weekly: {
    id: 'lottery_vip_weekly',
    name: 'Lotería VIP Semanal',
    description: 'Premio de 6,000 USD',
    prizeAmount: 6000, // USD
    ticketCostUSD: 100,
    minRank: 'vip' as UserRank,
    drawDay: 5, // Viernes
    drawHour: 0, // 00:00
    icon: '👑',
    color: 'yellow',
  },
  monthly: {
    id: 'lottery_vip_monthly',
    name: 'Lotería VIP Mensual',
    description: 'Premio de 10,000 USD',
    prizeAmount: 10000, // USD
    ticketCostUSD: 150,
    minRank: 'vip' as UserRank,
    drawDay: 5, // Viernes (último del mes)
    drawHour: 0, // 00:00
    icon: '🏆',
    color: 'amber',
  },
} as const;

/**
 * Verifica si un usuario puede participar en un sorteo según su rango
 * @param userRank - Rango del usuario
 * @param minRank - Rango mínimo requerido
 * @returns True si el usuario puede participar
 */
export function canParticipateInDraw(userRank: UserRank, minRank: UserRank): boolean {
  return compareRanks(userRank, minRank) >= 0;
}

/**
 * Obtiene todas las configuraciones de sorteos disponibles para un rango
 * @param userRank - Rango del usuario
 * @returns Array con las configuraciones disponibles
 */
export function getAvailableRaffles(userRank: UserRank) {
  const raffles = [];
  if (canParticipateInDraw(userRank, RAFFLE_CONFIG.weekly.minRank)) {
    raffles.push(RAFFLE_CONFIG.weekly);
  }
  if (canParticipateInDraw(userRank, RAFFLE_CONFIG.monthly.minRank)) {
    raffles.push(RAFFLE_CONFIG.monthly);
  }
  return raffles;
}

/**
 * Obtiene todas las loterías normales disponibles para un rango
 * @param userRank - Rango del usuario
 * @returns Array con las configuraciones disponibles
 */
export function getAvailableLotteries(userRank: UserRank) {
  const lotteries = [];
  if (canParticipateInDraw(userRank, LOTTERY_NORMAL_CONFIG.weekly.minRank)) {
    lotteries.push(LOTTERY_NORMAL_CONFIG.weekly);
  }
  if (canParticipateInDraw(userRank, LOTTERY_NORMAL_CONFIG.monthly.minRank)) {
    lotteries.push(LOTTERY_NORMAL_CONFIG.monthly);
  }
  return lotteries;
}

/**
 * Obtiene todas las loterías VIP disponibles para un rango
 * @param userRank - Rango del usuario
 * @returns Array con las configuraciones disponibles
 */
export function getAvailableVIPLotteries(userRank: UserRank) {
  const lotteries = [];
  if (canParticipateInDraw(userRank, LOTTERY_VIP_CONFIG.weekly.minRank)) {
    lotteries.push(LOTTERY_VIP_CONFIG.weekly);
  }
  if (canParticipateInDraw(userRank, LOTTERY_VIP_CONFIG.monthly.minRank)) {
    lotteries.push(LOTTERY_VIP_CONFIG.monthly);
  }
  return lotteries;
}

/**
 * Calcula la próxima fecha de sorteo (viernes 00:00)
 * @param isMonthly - Si es true, busca el último viernes del mes
 * @returns Fecha del próximo sorteo
 */
export function getNextDrawDate(isMonthly: boolean = false): Date {
  const now = new Date();
  const nextDraw = new Date(now);

  // Encontrar el próximo viernes
  const daysUntilFriday = (5 - now.getDay() + 7) % 7;
  nextDraw.setDate(now.getDate() + (daysUntilFriday === 0 ? 7 : daysUntilFriday));
  nextDraw.setHours(0, 0, 0, 0);

  if (isMonthly) {
    // Buscar el último viernes del mes
    const year = nextDraw.getFullYear();
    const month = nextDraw.getMonth();
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const lastFriday = new Date(lastDayOfMonth);

    // Retroceder hasta encontrar el viernes
    while (lastFriday.getDay() !== 5) {
      lastFriday.setDate(lastFriday.getDate() - 1);
    }
    lastFriday.setHours(0, 0, 0, 0);

    // Si el último viernes ya pasó, buscar el del próximo mes
    if (lastFriday < now) {
      const nextMonth = new Date(year, month + 2, 0);
      const nextLastFriday = new Date(nextMonth);
      while (nextLastFriday.getDay() !== 5) {
        nextLastFriday.setDate(nextLastFriday.getDate() - 1);
      }
      nextLastFriday.setHours(0, 0, 0, 0);
      return nextLastFriday;
    }

    return lastFriday;
  }

  return nextDraw;
}

export default ECONOMY;
