'use client';

import { useState, useCallback } from 'react';
import { ECONOMY, counterMsForRank, type UserRank } from '../lib/economyConfig';
import * as simStorage from '../lib/simStorage';

interface RefreshResult {
  ok: boolean;
  code?: string;
  message: string;
  counterExpiresAt?: Date;
  points?: number;
}

export const useRefresh = () => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  const refreshCounter = useCallback(async (): Promise<RefreshResult> => {
    setIsRefreshing(true);
    setRefreshMessage(null);
    setRefreshError(null);

    try {
      // CORREGIDO: Usar simStorage para lectura transaccional segura
      const userData = simStorage.read();

      // Validate user has >= 40 points
      const currentPoints = userData.points || 0;
      const cost = ECONOMY.costs.refreshCounter; // 40 points

      if (currentPoints < cost) {
        const errorMsg = 'Puntos insuficientes, asciende o mira anuncios para conseguir puntos extras';
        setRefreshError(errorMsg);
        setIsRefreshing(false);
        return {
          ok: false,
          code: 'INSUFFICIENT_POINTS',
          message: errorMsg,
        };
      }

      // Deduct 40 points
      const newPoints = currentPoints - cost;

      // Get rank duration in milliseconds
      const resetMs = counterMsForRank((userData.currentRank || 'registrado') as UserRank);

      // Reset counterExpiresAt to now + rank duration
      const now = new Date();
      const counterExpiresAt = new Date(now.getTime() + resetMs);
      
      // Log opcional para depuración
      if (typeof window !== 'undefined' && (window as any).__simStorageDebug) {
        console.log('[useRefresh] 🔄 Refrescando contador:', {
          puntosBase: currentPoints,
          costo: cost,
          puntosFinales: newPoints,
          nuevoExpira: counterExpiresAt.toISOString(),
        });
      }

      // CORREGIDO: Guardar datos actualizados usando simStorage (transaccional)
      await simStorage.writeMerge({
        points: newPoints,
        counterExpiresAt: counterExpiresAt.toISOString(),
        lastRefresh: now.toISOString(),
      });

      const successMsg = `Contador reiniciado ✅ (-${cost} pts)`;
      setRefreshMessage(successMsg);
      setIsRefreshing(false);

      // Clear message after 3 seconds
      setTimeout(() => {
        setRefreshMessage(null);
      }, 3000);

      return {
        ok: true,
        counterExpiresAt,
        points: newPoints,
        message: successMsg,
      };
    } catch (error) {
      console.error('Error refreshing counter:', error);
      const errorMsg = 'Error al refrescar el contador';
      setRefreshError(errorMsg);
      setIsRefreshing(false);
      return {
        ok: false,
        message: errorMsg,
      };
    }
  }, []);

  const clearMessages = useCallback(() => {
    setRefreshMessage(null);
    setRefreshError(null);
  }, []);

  return {
    refreshCounter,
    isRefreshing,
    refreshMessage,
    refreshError,
    clearMessages,
  };
};
