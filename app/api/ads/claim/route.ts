/**
 * POST /api/ads/claim
 * Reclama puntos por ver un anuncio con validación de límites diarios
 * 
 * Valida:
 * - Límite diario de anuncios según el rango del usuario
 * - Que el usuario no haya visto el mismo anuncio en las últimas 24h
 * - Reset automático a medianoche
 */

import { NextRequest, NextResponse } from 'next/server';

// Definición de límites diarios por rango
const RANK_DAILY_LIMITS: Record<string, number> = {
  registrado: 5,
  invitado: 30,
  miembro: 45,
  vip: 60,
  premium: 80,
  elite: 100,
};

type UserRank = keyof typeof RANK_DAILY_LIMITS;

interface AdClaimHistory {
  adId: string;
  lastClaimTime: string; // ISO string
  nextClaimTime: string; // ISO string
}

interface UserAdHistory {
  userId: string;
  rank: UserRank;
  totalClaimsToday: number;
  lastClaimDate: string; // YYYY-MM-DD
  claims: AdClaimHistory[];
}

// Clave de almacenamiento en localStorage/DB simulada
const STORAGE_KEY = 'ad_claim_history';

// Simulación de almacenamiento (en un entorno real, esto sería una base de datos)
let memoryStorage: Record<string, string> = {};

function getStorageItem(key: string): string | null {
  if (typeof window === 'undefined') {
    // En el servidor usamos memoria
    return memoryStorage[key] || null;
  }

  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function setStorageItem(key: string, value: string): void {
  if (typeof window === 'undefined') {
    memoryStorage[key] = value;
    return;
  }

  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignorar errores de almacenamiento
  }
}

// Función para obtener la fecha en formato YYYY-MM-DD
function getDateKey(date: Date): string {
  return date.toISOString().split('T')[0]!;
}

// Obtiene el límite diario para un rango dado
function getDailyLimitForRank(rank: UserRank): number {
  return RANK_DAILY_LIMITS[rank] ?? 0;
}

// Calcula la próxima medianoche para resetear
function getNextMidnight(date: Date): Date {
  const next = new Date(date);
  next.setHours(24, 0, 0, 0);
  return next;
}

// Obtiene el historial de un usuario específico
function getUserAdHistory(userId: string): UserAdHistory | null {
  const raw = getStorageItem(`${STORAGE_KEY}_${userId}`);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as UserAdHistory;
  } catch {
    return null;
  }
}

// Guarda el historial de un usuario
function setUserAdHistory(history: UserAdHistory): void {
  setStorageItem(`${STORAGE_KEY}_${history.userId}`, JSON.stringify(history));
}

/**
 * Valida si un usuario puede reclamar un anuncio:
 * - Respeta el límite diario por rango
 * - No permite reclamar el mismo anuncio dentro del periodo de enfriamiento
 */
function validateAdClaimOnClient(
  userId: string,
  adId: string,
  userRank: string
): { ok: boolean; error?: string; canClaim: boolean } {
  try {
    const rank = (userRank || 'registrado') as UserRank;
    const now = new Date();
    const todayKey = getDateKey(now);
    const dailyLimit = getDailyLimitForRank(rank);

    let history = getUserAdHistory(userId);

    // Si no hay historial, creamos uno nuevo
    if (!history) {
      history = {
        userId,
        rank,
        totalClaimsToday: 0,
        lastClaimDate: todayKey,
        claims: [],
      };

      setUserAdHistory(history);

      return {
        ok: true,
        canClaim: true,
      };
    }

    // Si cambió el día, reseteamos el contador diario
    if (history.lastClaimDate !== todayKey) {
      history.totalClaimsToday = 0;
      history.lastClaimDate = todayKey;
      history.claims = []; // Opcional: limpiar el historial de anuncios
    }

    // Verificar límite diario
    if (history.totalClaimsToday >= dailyLimit) {
      return {
        ok: false,
        error: `Has alcanzado el límite diario de ${dailyLimit} anuncios para tu rango (${rank})`,
        canClaim: false,
      };
    }

    // Verificar si ya vio este anuncio en las últimas 24h
    const existingView = history.claims.find((c) => c.adId === adId);
    if (existingView && new Date(existingView.nextClaimTime) > now) {
      return {
        ok: false,
        error: 'Ya viste este anuncio recientemente',
        canClaim: false,
      };
    }

    return { ok: true, canClaim: true };
  } catch (error) {
    console.error('Error validando anuncio:', error);
    return { ok: false, error: 'Error de validación', canClaim: false };
  }
}
