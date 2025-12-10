/**
 * Constantes de rangos y bonificaciones del sistema YigiCoin
 * 
 * Este archivo centraliza todos los bonos de puntos otorgados al ascender de rango.
 * Los bonos son ACUMULATIVOS a los puntos previos del usuario.
 * 
 * @module constants/ranks
 */

/**
 * Tipos de rangos disponibles en el sistema
 */
export type RankId =
  | 'registrado'
  | 'invitado'
  | 'miembro'
  | 'vip'
  | 'premium'
  | 'elite';

/**
 * Bonificación de puntos por ascenso a cada rango
 * 
 * Estos puntos se SUMAN a los puntos existentes del usuario.
 * NUNCA se resetean los puntos al ascender.
 * 
 * Fórmula al ascender:
 * ```
 * puntos_finales = puntos_actuales + RANK_BONUS[nuevo_rango]
 * ```
 * 
 * @example
 * // Usuario con 35 puntos asciende a 'invitado' (bonus: 10)
 * // Resultado: 35 + 10 = 45 puntos
 * 
 * @example
 * // Usuario con 50 puntos asciende a 'miembro' (bonus: 30)
 * // Resultado: 50 + 30 = 80 puntos
 */
export const RANK_BONUS: Record<RankId, number> = {
  /** Rango inicial - sin bonus */
  registrado: 0,

  /** Primer ascenso - bonus de bienvenida */
  invitado: 10,

  /** Segundo nivel - bonus moderado */
  miembro: 30,

  /** Tercer nivel - bonus significativo */
  vip: 100,

  /** Cuarto nivel - bonus premium */
  premium: 250,

  /** Nivel máximo - bonus elite */
  elite: 400,
} as const;

/**
 * Obtiene el bonus de puntos para un rango específico
 * @param rank - ID del rango
 * @returns Cantidad de puntos de bonus (0 si el rango no existe)
 * 
 * @example
 * const bonus = getRankBonus('vip'); // Retorna: 100
 */
export function getRankBonus(rank: RankId): number {
  return RANK_BONUS[rank] ?? 0;
}

/**
 * Nombres legibles de los rangos (para UI)
 */
export const RANK_NAMES: Record<RankId, string> = {
  registrado: 'Registrado',
  invitado: 'Invitado',
  miembro: 'Miembro',
  vip: 'VIP',
  premium: 'Premium',
  elite: 'Elite',
} as const;

/**
 * Obtiene el nombre legible de un rango
 * @param rank - ID del rango
 * @returns Nombre del rango en español
 * 
 * @example
 * const name = getRankName('vip'); // Retorna: 'VIP'
 */
export function getRankName(rank: RankId): string {
  return RANK_NAMES[rank] ?? 'Desconocido';
}

/**
 * Orden jerárquico de rangos (de menor a mayor)
 */
export const RANK_ORDER: RankId[] = [
  'registrado',
  'invitado',
  'miembro',
  'vip',
  'premium',
  'elite',
] as const;

/**
 * Obtiene el índice del rango en la jerarquía
 * @param rank - ID del rango
 * @returns Índice del rango (0-5), o -1 si no existe
 * 
 * @example
 * const index = getRankIndex('miembro'); // Retorna: 2
 */
export function getRankIndex(rank: RankId): number {
  return RANK_ORDER.indexOf(rank);
}

/**
 * Verifica si un rango es mayor que otro
 * @param rank1 - Primer rango a comparar
 * @param rank2 - Segundo rango a comparar
 * @returns true si rank1 > rank2
 * 
 * @example
 * isRankHigher('vip', 'miembro'); // Retorna: true
 * isRankHigher('invitado', 'premium'); // Retorna: false
 */
export function isRankHigher(rank1: RankId, rank2: RankId): boolean {
  return getRankIndex(rank1) > getRankIndex(rank2);
}

/**
 * Obtiene el siguiente rango en la jerarquía
 * @param currentRank - Rango actual
 * @returns Siguiente rango, o null si ya está en el máximo
 * 
 * @example
 * const next = getNextRank('miembro'); // Retorna: 'vip'
 * const next = getNextRank('elite'); // Retorna: null
 */
export function getNextRank(currentRank: RankId): RankId | null {
  const currentIndex = getRankIndex(currentRank);
  if (currentIndex === -1 || currentIndex >= RANK_ORDER.length - 1) {
    return null;
  }
  return RANK_ORDER[currentIndex + 1];
}

/**
 * Calcula el total de puntos acumulados al ascender a un rango
 * (suma de todos los bonos desde registrado hasta el rango objetivo)
 * 
 * @param targetRank - Rango objetivo
 * @returns Total de puntos de bonus acumulados
 * 
 * @example
 * // Total de bonos hasta 'miembro': 0 + 10 + 30 = 40
 * const total = getTotalBonusUpToRank('miembro'); // Retorna: 40
 */
export function getTotalBonusUpToRank(targetRank: RankId): number {
  const targetIndex = getRankIndex(targetRank);
  if (targetIndex === -1) return 0;

  let total = 0;
  for (let i = 0; i <= targetIndex; i++) {
    total += RANK_BONUS[RANK_ORDER[i]];
  }
  return total;
}
