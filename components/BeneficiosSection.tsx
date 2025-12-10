'use client';

import React, { useState, useEffect } from 'react';
import { STORE_ITEMS, canAccessStore, ECONOMY, type UserRank } from '@/lib/economyConfig';

interface BeneficiosSectionProps {
  currentRank: string;
  selectedTheme?: string;
  userPoints?: number;
  userTotems?: number;
  onPurchaseTotem?: () => Promise<void> | void;
  onPurchaseAdPackage?: () => Promise<void> | void;
  userId?: string;
}

function BeneficiosSection({
  currentRank,
  selectedTheme = 'claro',
  userPoints: propUserPoints,
  userTotems: propUserTotems,
  onPurchaseTotem,
  onPurchaseAdPackage,
}: BeneficiosSectionProps) {
  const [userPoints, setUserPoints] = useState<number>(propUserPoints ?? 0);
  const [userTotems, setUserTotems] = useState<number>(propUserTotems ?? 0);
  const [isPurchasing, setIsPurchasing] = useState(false);

  const rankKey = (currentRank || 'registrado') as UserRank;
  const hasStoreAccess = canAccessStore(rankKey);
  const maxTotems = ECONOMY.maxTotems;
  const defaultAdPackage = STORE_ITEMS.adPackages[0];

  // Sincroniza con localStorage sólo cuando no vienen puntos/tótems por props
  useEffect(() => {
    if (propUserPoints != null || propUserTotems != null) return;

    try {
      const raw = localStorage.getItem('user_simulation_data');
      if (!raw) return;
      const data = JSON.parse(raw);
      setUserPoints(data.points ?? 0);
      setUserTotems(data.totems ?? 0);
    } catch (error) {
      console.error('Error leyendo user_simulation_data:', error);
    }
  }, [propUserPoints, propUserTotems]);

  const handleBuyTotem = async () => {
    if (isPurchasing) return;
    setIsPurchasing(true);

    try {
      if (userTotems >= maxTotems) {
        alert(`Ya tienes el máximo de ${maxTotems} tótems.`);
        return;
      }

      // Si el padre define su propia lógica, se respeta
      if (onPurchaseTotem) {
        await onPurchaseTotem();
        return;
      }

      const raw = localStorage.getItem('user_simulation_data') || '{}';
      const data = JSON.parse(raw);

      const cost = STORE_ITEMS.totem.pricePoints;
      const currentPoints = Number(data.points ?? 0);
      const currentTotems = Number(data.totems ?? 0);

      if (currentPoints < cost) {
        alert(
          `Puntos insuficientes. Necesitas ${cost} puntos pero solo tienes ${currentPoints}.`
        );
        return;
      }

      if (currentTotems >= maxTotems) {
        alert(`Ya tienes el máximo de ${maxTotems} tótems.`);
        return;
      }

      const newPoints = currentPoints - cost;
      const newTotems = currentTotems + 1;

      data.points = newPoints;
      data.totems = newTotems;
      localStorage.setItem('user_simulation_data', JSON.stringify(data));

      setUserPoints(newPoints);
      setUserTotems(newTotems);
      alert(`¡Tótem comprado exitosamente! Ahora tienes ${newTotems} tótem(s).`);
    } catch (error) {
      console.error('Error buying totem:', error);
      alert('Error al comprar tótem. Por favor, intenta de nuevo.');
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleBuyAdPackage = async () => {
    if (isPurchasing) return;
    setIsPurchasing(true);

    try {
      // Si el padre define su propia lógica, se respeta
      if (onPurchaseAdPackage) {
        await onPurchaseAdPackage();
        return;
      }

      const raw = localStorage.getItem('user_simulation_data') || '{}';
      const data = JSON.parse(raw);

      const cost = defaultAdPackage.pricePoints;
      const currentPoints = Number(data.points ?? 0);

      if (currentPoints < cost) {
        alert(
          `Puntos insuficientes. Necesitas ${cost} puntos pero solo tienes ${currentPoints}.`
        );
        return;
      }

      const newPoints = currentPoints - cost;

      // Registramos compra sencilla de paquete
      const existingPackages = Array.isArray(data.adPackages) ? data.adPackages : [];
      data.points = newPoints;
      data.adPackages = [
        ...existingPackages,
        {
          id: defaultAdPackage.id,
          visits: defaultAdPackage.visits,
          purchasedAt: new Date().toISOString(),
        },
      ];

      localStorage.setItem('user_simulation_data', JSON.stringify(data));
      setUserPoints(newPoints);
      alert('¡Paquete de anuncios comprado exitosamente!');
    } catch (error) {
      console.error('Error buying ad package:', error);
      alert('Error al comprar paquete. Por favor, intenta de nuevo.');
    } finally {
      setIsPurchasing(false);
    }
  };

  const cardBg =
    selectedTheme === 'oscuro'
      ? 'bg-gray-800 border-gray-700'
      : 'bg-white border-gray-200';
  const mutedText =
    selectedTheme === 'oscuro' ? 'text-gray-400' : 'text-gray-600';

  return (
    <div className={`rounded-2xl border ${cardBg} p-4 sm:p-6`}>
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <div>
          <h2 className="text-lg sm:text-xl font-bold">
            Beneficios del nivel {currentRank}
          </h2>
          <p className={`text-xs sm:text-sm ${mutedText}`}>
            Aquí gestionas tus tótems y paquetes de visitas. Los sorteos y loterías se
            activarán más adelante como parte de la Versión 2.
          </p>
        </div>
        <div
          className={`px-3 py-2 rounded-lg border text-right ${
            selectedTheme === 'oscuro'
              ? 'bg-gray-800 border-gray-700'
              : 'bg-yellow-50 border-yellow-200'
          }`}
        >
          <p className="text-xs font-medium text-gray-600">Tus puntos</p>
          <p className="text-lg font-bold text-yellow-600">
            <i className="ri-star-line mr-1" />
            {userPoints}
          </p>
        </div>
      </div>

      {!hasStoreAccess && (
        <div
          className={`mb-4 sm:mb-6 rounded-xl px-4 py-3 text-sm border ${
            selectedTheme === 'oscuro'
              ? 'bg-gray-800 border-gray-700 text-gray-200'
              : 'bg-gray-50 border-gray-200 text-gray-700'
          }`}
        >
          <p className="font-semibold mb-1">Aún no tienes acceso a la tienda.</p>
          <p className={mutedText}>
            La Tienda YigiCoin se desbloquea desde el rango <strong>invitado</strong> en
            adelante.
          </p>
        </div>
      )}

      {hasStoreAccess && (
        <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
          {/* Card: Tótems */}
          <div className={`rounded-xl border ${cardBg} p-4 sm:p-5 flex flex-col gap-3`}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                  <span>🗿 Tótems digitales</span>
                </h3>
                <p className={`text-xs sm:text-sm ${mutedText}`}>
                  Protegen tu cuenta cuando el contador expira. Ideales para evitar suspensión
                  en momentos críticos.
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Tus tótems
                </p>
                <p
                  className={`text-lg font-bold ${
                    userTotems > 0 ? 'text-green-500' : 'text-red-500'
                  }`}
                >
                  {userTotems} / {maxTotems}
                </p>
              </div>
            </div>

            <div
              className={`mt-2 rounded-lg px-3 py-2 text-xs sm:text-sm border ${
                selectedTheme === 'oscuro'
                  ? 'bg-gray-800 border-gray-700 text-gray-200'
                  : 'bg-gray-50 border-gray-200 text-gray-700'
              }`}
            >
              <p className={mutedText}>
                Coste: <strong>{STORE_ITEMS.totem.pricePoints} puntos</strong>. Se usa de
                forma automática cuando tu contador llega a cero (según la lógica que
                definas en el backend).
              </p>
            </div>

            <button
              onClick={handleBuyTotem}
              disabled={isPurchasing}
              className={`mt-3 w-full py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isPurchasing ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
              } ${
                selectedTheme === 'oscuro'
                  ? 'bg-purple-600 hover:bg-purple-700 text-white'
                  : 'bg-purple-600 hover:bg-purple-700 text-white'
              }`}
            >
              {isPurchasing ? 'Procesando...' : 'Comprar tótem'}
            </button>
          </div>

          {/* Card: Paquete de visitas */}
          <div className={`rounded-xl border ${cardBg} p-4 sm:p-5 flex flex-col gap-3`}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                  <span>📢 Paquete de visitas</span>
                </h3>
                <p className={`text-xs sm:text-sm ${mutedText}`}>
                  Compra un paquete de visitas para tus campañas de anuncios dentro de la
                  plataforma.
                </p>
              </div>
            </div>

            <div
              className={`mt-2 rounded-lg px-3 py-2 text-xs sm:text-sm border ${
                selectedTheme === 'oscuro'
                  ? 'bg-gray-800 border-gray-700 text-gray-200'
                  : 'bg-gray-50 border-gray-200 text-gray-700'
              }`}
            >
              <p className={mutedText}>
                Paquete seleccionado:{' '}
                <strong>{defaultAdPackage.name}</strong> (
                {defaultAdPackage.visits.toLocaleString()} visitas)
              </p>
              <p className={mutedText}>
                Coste: <strong>{defaultAdPackage.pricePoints} puntos</strong>.
              </p>
            </div>

            <button
              onClick={handleBuyAdPackage}
              disabled={isPurchasing}
              className={`mt-3 w-full py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isPurchasing ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
              } ${
                selectedTheme === 'oscuro'
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {isPurchasing ? 'Procesando...' : 'Comprar paquete de visitas'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default BeneficiosSection;
