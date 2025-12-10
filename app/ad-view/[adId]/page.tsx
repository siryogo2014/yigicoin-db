'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';

export default function AdViewPage() {
  const params = useParams();
  const adId = params?.adId as string;

  // Estados
  const [progress, setProgress] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(10); // 10 segundos
  const [canClaim, setCanClaim] = useState(false);
  const [pointsClaimed, setPointsClaimed] = useState(false);
  const [isPageVisible, setIsPageVisible] = useState(true);
  const [isAlreadyClaimed, setIsAlreadyClaimed] = useState(false);
  const [nextClaimTime, setNextClaimTime] = useState<string>('');
  const [adData, setAdData] = useState<any>(null);

  // Referencias para manejar el tiempo
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const elapsedTimeRef = useRef<number>(0);

  // Cargar datos del anuncio desde sessionStorage
  useEffect(() => {
    try {
      const adDataStr = sessionStorage.getItem(`ad_${adId}`);
      if (adDataStr) {
        const data = JSON.parse(adDataStr);
        setAdData(data);
      }
    } catch (error) {
      console.error('Error loading ad data:', error);
    }
  }, [adId]);

  // Verificar si el anuncio ya fue reclamado hoy (reinicio a medianoche)
  useEffect(() => {
    const checkClaimStatus = () => {
      try {
        const adClaimsToday = JSON.parse(localStorage.getItem('ad_claims_today') || '{}');
        const today = new Date().toISOString().split('T')[0];

        // Si la fecha guardada no es hoy, limpiar los reclamos
        if (adClaimsToday.date !== today) {
          localStorage.setItem('ad_claims_today', JSON.stringify({ date: today, claims: {} }));
          setIsAlreadyClaimed(false);
          return;
        }

        // Verificar si ya reclamó este anuncio hoy
        if (adClaimsToday.claims && adClaimsToday.claims[adId]) {
          setIsAlreadyClaimed(true);

          // Calcular tiempo hasta medianoche
          const now = new Date();
          const midnight = new Date(now);
          midnight.setHours(24, 0, 0, 0);

          const diff = midnight.getTime() - now.getTime();
          const hours = Math.floor(diff / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          setNextClaimTime(`${hours}h ${minutes}m hasta medianoche`);
        } else {
          setIsAlreadyClaimed(false);
        }
      } catch (error) {
        console.error('Error checking claim status:', error);
      }
    };

    checkClaimStatus();
    const interval = setInterval(checkClaimStatus, 1000);
    return () => clearInterval(interval);
  }, [adId]);

  // Page Visibility API - Pausar/Reanudar contador
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        setIsPageVisible(true);
        startTimeRef.current = Date.now() - elapsedTimeRef.current * 1000;
      } else {
        setIsPageVisible(false);
        elapsedTimeRef.current = (Date.now() - startTimeRef.current) / 1000;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Timer principal - Inicia automáticamente cuando la página carga
  useEffect(() => {
    if (isAlreadyClaimed || pointsClaimed || !isPageVisible) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    // Iniciar automáticamente al cargar
    intervalRef.current = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.max(0, (now - startTimeRef.current) / 1000);
      const remaining = Math.max(0, 10 - elapsed);
      const progressPercent = Math.min(100, (elapsed / 10) * 100);

      setProgress(progressPercent);
      setTimeRemaining(remaining);

      if (remaining <= 0) {
        setCanClaim(true);
        if (intervalRef.current) clearInterval(intervalRef.current);
      }
    }, 100);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPageVisible, isAlreadyClaimed, pointsClaimed]);

  // Reclamar puntos
  const handleClaimPoints = () => {
    if (!canClaim || pointsClaimed || isAlreadyClaimed) return;

    try {
      const now = new Date();
      const today = now.toISOString().split('T')[0];

      // Guardar reclamo del día (por anuncio)
      const adClaimsToday = JSON.parse(localStorage.getItem('ad_claims_today') || '{}');
      if (!adClaimsToday.claims) adClaimsToday.claims = {};

      adClaimsToday.date = today;
      adClaimsToday.claims[adId] = {
        claimedAt: now.toISOString(),
        points: 2,
      };

      localStorage.setItem('ad_claims_today', JSON.stringify(adClaimsToday));

      // Actualizar puntos del usuario + contador diario global
      const userData = JSON.parse(localStorage.getItem('user_simulation_data') || '{}');

      // 1) Puntos
      userData.points = (userData.points || 0) + 2;

      // 2) Tracking diario global (clave: daily_ad_tracking)
      const storedDailyRaw = localStorage.getItem('daily_ad_tracking');
      let dailyTracking: { date: string; adsViewed: number; lastResetTime: string };

      if (!storedDailyRaw) {
        dailyTracking = {
          date: today,
          adsViewed: 1,
          lastResetTime: now.toISOString(),
        };
      } else {
        try {
          const parsed = JSON.parse(storedDailyRaw);
          if (!parsed || parsed.date !== today) {
            dailyTracking = {
              date: today,
              adsViewed: 1,
              lastResetTime: now.toISOString(),
            };
          } else {
            dailyTracking = {
              ...parsed,
              adsViewed: (parsed.adsViewed || 0) + 1,
              lastResetTime: parsed.lastResetTime || now.toISOString(),
            };
          }
        } catch {
          dailyTracking = {
            date: today,
            adsViewed: 1,
            lastResetTime: now.toISOString(),
          };
        }
      }

      // Guardar tracking en ambas estructuras
      localStorage.setItem('daily_ad_tracking', JSON.stringify(dailyTracking));
      userData.dailyAdTracking = dailyTracking;

      // Guardar userData completo
      localStorage.setItem('user_simulation_data', JSON.stringify(userData));

      setPointsClaimed(true);

      // Evento opcional para otras partes de la app
      window.dispatchEvent(new CustomEvent('pointsUpdated', { detail: { points: userData.points } }));

      setTimeout(() => {
        alert('¡Has ganado 2 puntos exitosamente! Puedes seguir navegando en esta pestaña.');
      }, 100);
    } catch (error) {
      console.error('Error claiming points:', error);
      alert('Error al reclamar puntos. Por favor intenta nuevamente.');
    }
  };


  // Render de la página
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Barra de Progreso Fija en la Parte Superior */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white shadow-lg">
        {/* Barra de progreso horizontal con botón al lado derecho */}
        <div className="flex items-center">
          {/* Barra de progreso */}
          <div className="flex-1 h-16 bg-gray-200 relative overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ease-out ${canClaim
                  ? 'bg-gradient-to-r from-green-400 via-emerald-500 to-green-600'
                  : isAlreadyClaimed
                    ? 'bg-gradient-to-r from-red-400 to-red-600'
                    : pointsClaimed
                      ? 'bg-gradient-to-r from-green-500 to-emerald-700'
                      : 'bg-gradient-to-r from-blue-400 via-purple-500 to-blue-600'
                }`}
              style={{ width: `${progress}%` }}
            >
              {/* Contenido de la barra de progreso */}
              <div className="h-full flex items-center px-4">
                {!isPageVisible && !canClaim && !pointsClaimed && !isAlreadyClaimed && (
                  <div className="flex items-center space-x-2 text-white">
                    <i className="ri-pause-circle-line text-xl animate-pulse"></i>
                    <span className="font-semibold text-sm">Contador Pausado</span>
                  </div>
                )}

                {isPageVisible && !canClaim && !pointsClaimed && !isAlreadyClaimed && (
                  <div className="flex items-center space-x-3 text-white">
                    <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <div>
                      <p className="font-bold text-sm">Visualizando Anuncio...</p>
                      <p className="text-xs opacity-90">{adData?.title || 'Cargando...'}</p>
                    </div>
                  </div>
                )}

                {canClaim && !pointsClaimed && !isAlreadyClaimed && (
                  <div className="flex items-center space-x-2 text-white">
                    <i className="ri-star-fill text-2xl text-yellow-300 animate-bounce"></i>
                    <span className="font-bold text-sm">¡Listo para Reclamar!</span>
                  </div>
                )}

                {pointsClaimed && (
                  <div className="flex items-center space-x-2 text-white">
                    <i className="ri-check-circle-fill text-2xl"></i>
                    <span className="font-bold text-sm">¡2 Puntos Reclamados!</span>
                  </div>
                )}

                {isAlreadyClaimed && (
                  <div className="flex items-center space-x-2 text-white">
                    <i className="ri-time-line text-xl"></i>
                    <span className="font-semibold text-sm">Ya Reclamado Hoy</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Botón al lado derecho */}
          <div className="h-16 px-4 flex items-center bg-white border-l border-gray-200">
            {!canClaim && !pointsClaimed && !isAlreadyClaimed && (
              <button
                disabled
                className="px-6 py-2 bg-gray-300 text-gray-600 rounded-lg font-bold text-lg cursor-not-allowed min-w-[140px]"
              >
                {Math.ceil(timeRemaining)}s
              </button>
            )}

            {canClaim && !pointsClaimed && !isAlreadyClaimed && (
              <button
                onClick={handleClaimPoints}
                className="px-6 py-2 bg-green-600 text-white rounded-lg font-bold text-base hover:bg-green-700 transition-all hover:scale-105 transform shadow-lg animate-pulse min-w-[140px]"
              >
                Reclamar Puntos
              </button>
            )}

            {pointsClaimed && (
              <button
                disabled
                className="px-6 py-2 bg-green-500 text-white rounded-lg font-bold text-base cursor-not-allowed min-w-[140px]"
              >
                ✓ Reclamado
              </button>
            )}

            {isAlreadyClaimed && (
              <button
                disabled
                className="px-6 py-2 bg-red-400 text-red-800 rounded-lg font-bold text-sm cursor-not-allowed min-w-[140px]"
              >
                Bloqueado
              </button>
            )}
          </div>
        </div>

        {/* Información adicional debajo de la barra */}
        {isAlreadyClaimed && (
          <div className="bg-red-50 border-t border-red-200 px-4 py-2">
            <p className="text-red-800 text-sm text-center">
              <i className="ri-information-line mr-1"></i>
              Ya reclamaste este anuncio hoy. Podrás reclamarlo nuevamente en: <strong>{nextClaimTime}</strong>
            </p>
          </div>
        )}
      </div>

      {/* Contenido Principal - iframe con el anuncio */}
      <div className="pt-16">
        {adData && adData.url && (
          <iframe
            src={adData.url}
            className="w-full h-screen border-0"
            title={adData.title || 'Anuncio'}
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
            onLoad={() => {
              // El contador ya se inició automáticamente
              console.log('Anuncio cargado completamente');
            }}
            onError={(e) => {
              // Si hay error en la carga, el contador sigue funcionando
              console.error('Error cargando iframe:', e);
            }}
          />
        )}

        {/* Fallback si no hay URL */}
        {(!adData || !adData.url) && (
          <div className="flex items-center justify-center h-screen">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="ri-advertisement-line text-3xl text-blue-600"></i>
              </div>
              <h1 className="text-2xl font-bold text-gray-800 mb-2">Cargando Anuncio...</h1>
              {adData && (
                <div className="mt-4">
                  <p className="text-lg font-semibold text-gray-700">{adData.title}</p>
                  <p className="text-sm text-gray-500 mt-1">{adData.description}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
