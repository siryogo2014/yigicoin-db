'use client';

import React, { useState } from 'react';
import { useSimulation } from '../hooks/useSimulation';

interface PublicidadSectionProps {
  selectedTheme?: string;
}

const PublicidadSection: React.FC<PublicidadSectionProps> = ({
  selectedTheme = 'claro',
}) => {
  const {
    simulationState,
    createUserAd,
    claimAdPoints,
    consumeAdVisit,
    getCurrentRankData,
  } = useSimulation();

  const [activeSubTab, setActiveSubTab] =
    useState<'ver-anuncios' | 'mis-anuncios'>('ver-anuncios');
  const [showCreateAdForm, setShowCreateAdForm] = useState(false);
  const [adForm, setAdForm] = useState({
    title: '',
    description: '',
    url: '',
  });

  const currentRankData = getCurrentRankData();
  const purchasedPackages = simulationState.adPackages?.length || 0;

  // ---- CÁLCULOS DE VISITAS (D) ----
  const totalPlanVisitsRemaining = simulationState.userAds.reduce(
    (acc, ad) => acc + Math.max(ad.maxViews - ad.viewsUsed, 0),
    0
  );

  const totalPackageVisitsRemaining = (simulationState.adPackages || []).reduce(
    (acc, pkg: any) =>
      acc +
      (typeof pkg.visitsRemaining === 'number'
        ? pkg.visitsRemaining
        : pkg.visits || 0),
    0
  );

  const totalVisitsRemaining =
    totalPlanVisitsRemaining + totalPackageVisitsRemaining;

  // ---- LÍMITE DE ANUNCIOS (C) ----
  const canCreateAd = () => {
    if (!currentRankData || currentRankData.monthlyVisits === 0) return false;
    const basePackages = currentRankData.adPackages || 0;
    const extraPackages = purchasedPackages;
    const maxAds = basePackages + extraPackages;
    return simulationState.userAds.length < maxAds;
  };

  // ---- CREAR / PUBLICAR ANUNCIO ----
  const handleCreateAd = () => {
    if (
      !adForm.title.trim() ||
      !adForm.description.trim() ||
      !adForm.url.trim()
    ) {
      alert('Completa título, descripción y URL del anuncio.');
      return;
    }

    const success = createUserAd({
      title: adForm.title.trim(),
      description: adForm.description.trim(),
      url: adForm.url.trim(),
      imageUrl: undefined,
      maxViews: currentRankData?.monthlyVisits ?? 100,
    });

    if (!success) {
      alert(
        'Ya alcanzaste el máximo de anuncios permitidos (rango + paquetes comprados).'
      );
      return;
    }

    setAdForm({ title: '', description: '', url: '' });
    setShowCreateAdForm(false);
    alert('¡Anuncio creado correctamente!');
  };

  const handlePublishUsingPackage = () => {
    if (!canCreateAd()) {
      alert(
        'Ya has utilizado todos los anuncios disponibles (rango + paquetes comprados).'
      );
      return;
    }
    setShowCreateAdForm(true);
  };

  // ---- VER ANUNCIOS (D) ----
  const dailyLimit = currentRankData?.dailyAdsLimit ?? 0;
  const viewedToday = simulationState.dailyAdTracking?.adsViewed ?? 0;
  const canViewMoreAds = dailyLimit === -1 || viewedToday < dailyLimit;

  const activeAds = simulationState.userAds.filter(
    (ad) =>
      ad.isActive && (ad.maxViews - ad.viewsUsed > 0 || totalPackageVisitsRemaining > 0)
  );

  const handleViewAd = async (adId: string) => {
    if (!canViewMoreAds) {
      alert(
        'Has alcanzado el límite diario de anuncios que puedes ver con tu rango.'
      );
      return;
    }

    const consumed = await consumeAdVisit(adId);
    if (!consumed) {
      alert('Este anuncio ya no tiene visitas disponibles (plan + paquetes).');
      return;
    }

    const claimed = await claimAdPoints(adId);
    if (!claimed) {
      alert(
        'Has visto el anuncio, pero no puedes reclamar más puntos por este anuncio ahora (límite diario o tiempo de espera).'
      );
    } else {
      alert('Has visto el anuncio y has recibido puntos.');
    }
  };

  // ---- RENDER: VER ANUNCIOS ----
  const renderVerAnuncios = () => (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <h3
          className={`text-lg sm:text-xl font-bold ${selectedTheme === 'oscuro' ? 'text-white' : 'text-gray-800'
            }`}
        >
          Ver Anuncios
        </h3>
        <div className="text-xs sm:text-sm">
          <span
            className={
              selectedTheme === 'oscuro' ? 'text-gray-300' : 'text-gray-600'
            }
          >
            Hoy has visto{' '}
            <strong>
              {viewedToday}
              {dailyLimit === -1 ? '' : ` / ${dailyLimit}`}
            </strong>{' '}
            anuncios
          </span>
        </div>
      </div>

      {activeAds.length === 0 ? (
        <div
          className={`rounded-xl border p-4 sm:p-6 text-center ${selectedTheme === 'oscuro'
              ? 'bg-gray-800 border-gray-700 text-gray-300'
              : 'bg-gray-50 border-gray-200 text-gray-700'
            }`}
        >
          <p className="mb-2">No hay anuncios disponibles con visitas.</p>
          <p className="text-xs">
            Cuando existan anuncios activos con visitas restantes, aparecerán
            aquí para que puedas verlos y ganar puntos.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {activeAds.map((ad) => {
            const planRemaining = Math.max(ad.maxViews - ad.viewsUsed, 0);
            return (
              <div
                key={ad.id}
                className={`border rounded-xl p-4 sm:p-5 ${selectedTheme === 'oscuro'
                    ? 'bg-gray-900 border-gray-700'
                    : 'bg-white border-gray-200'
                  }`}
              >
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex flex-col">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${selectedTheme === 'oscuro'
                            ? 'bg-green-900/40 text-green-300'
                            : 'bg-green-100 text-green-800'
                          }`}
                      >
                        {ad.userRank.toUpperCase()}
                      </span>
                      <span
                        className={`text-xs ${selectedTheme === 'oscuro'
                            ? 'text-gray-400'
                            : 'text-gray-500'
                          }`}
                      >
                        por {ad.userName}
                      </span>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-[11px] uppercase tracking-wide ${selectedTheme === 'oscuro'
                            ? 'text-gray-400'
                            : 'text-gray-500'
                          }`}
                      >
                        Estado
                      </p>
                      <p
                        className={`text-xs font-semibold ${selectedTheme === 'oscuro'
                            ? 'text-green-300'
                            : 'text-green-600'
                          }`}
                      >
                        {ad.isActive ? 'Activo' : 'Pausado'}
                      </p>
                    </div>
                  </div>

                  <h4
                    className={`text-base sm:text-lg font-semibold ${selectedTheme === 'oscuro'
                        ? 'text-white'
                        : 'text-gray-800'
                      }`}
                  >
                    {ad.title}
                  </h4>
                  <p
                    className={`text-xs sm:text-sm ${selectedTheme === 'oscuro'
                        ? 'text-gray-300'
                        : 'text-gray-600'
                      }`}
                  >
                    {ad.description}
                  </p>
                  <a
                    href={ad.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center gap-1 text-xs sm:text-sm font-medium cursor-pointer ${selectedTheme === 'oscuro'
                        ? 'text-blue-300 hover:text-blue-200'
                        : 'text-blue-600 hover:text-blue-700'
                      }`}
                  >
                    Abrir enlace
                    <i className="ri-external-link-line text-xs" />
                  </a>

                  <div className="grid grid-cols-2 gap-3 text-xs sm:text-sm mt-2">
                    <div>
                      <p
                        className={`text-[11px] uppercase tracking-wide ${selectedTheme === 'oscuro'
                            ? 'text-gray-400'
                            : 'text-gray-500'
                          }`}
                      >
                        Visitas restantes (plan)
                      </p>
                      <p
                        className={`font-semibold ${selectedTheme === 'oscuro'
                            ? 'text-gray-200'
                            : 'text-gray-800'
                          }`}
                      >
                        {planRemaining}
                      </p>
                    </div>
                    <div>
                      <p
                        className={`text-[11px] uppercase tracking-wide ${selectedTheme === 'oscuro'
                            ? 'text-gray-400'
                            : 'text-gray-500'
                          }`}
                      >
                        Visitas extra en paquetes (pool)
                      </p>
                      <p
                        className={`font-semibold ${selectedTheme === 'oscuro'
                            ? 'text-purple-300'
                            : 'text-purple-700'
                          }`}
                      >
                        {totalPackageVisitsRemaining}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex justify-end">
                    <button
                      onClick={() => handleViewAd(ad.id)}
                      disabled={!canViewMoreAds}
                      className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-medium cursor-pointer ${!canViewMoreAds
                          ? 'bg-gray-400 text-white cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                    >
                      Ver anuncio y ganar puntos
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // ---- RENDER: MIS ANUNCIOS ----
  const renderMisAnuncios = () => (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-2">
        <h3
          className={`text-lg sm:text-xl font-bold ${selectedTheme === 'oscuro' ? 'text-white' : 'text-gray-800'
            }`}
        >
          Mis Anuncios
        </h3>
        {canCreateAd() && (
          <button
            onClick={() => setShowCreateAdForm(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors cursor-pointer text-sm font-medium"
          >
            <i className="ri-add-line mr-1" />
            Crear anuncio
          </button>
        )}
      </div>

      {/* Resumen de plan + paquetes */}
      <div
        className={`border rounded-xl p-4 ${selectedTheme === 'oscuro'
            ? 'bg-gray-700 border-gray-600'
            : 'bg-blue-50 border-blue-200'
          }`}
      >
        <h4
          className={`font-semibold mb-2 ${selectedTheme === 'oscuro' ? 'text-white' : 'text-gray-800'
            }`}
        >
          Plan {currentRankData?.name ?? 'Miembro'}
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center text-xs sm:text-sm">
          <div>
            <p
              className={`text-[11px] uppercase tracking-wide ${selectedTheme === 'oscuro' ? 'text-gray-300' : 'text-gray-600'
                }`}
            >
              Visitas restantes (total)
            </p>
            <p className="text-base sm:text-lg font-bold text-blue-600">
              {totalVisitsRemaining}
            </p>
          </div>
          <div>
            <p
              className={`text-[11px] uppercase tracking-wide ${selectedTheme === 'oscuro' ? 'text-gray-300' : 'text-gray-600'
                }`}
            >
              Visitas del plan
            </p>
            <p className="text-base sm:text-lg font-bold text-green-600">
              {totalPlanVisitsRemaining}
            </p>
          </div>
          <div>
            <p
              className={`text-[11px] uppercase tracking-wide ${selectedTheme === 'oscuro' ? 'text-gray-300' : 'text-gray-600'
                }`}
            >
              Visitas en paquetes
            </p>
            <p className="text-base sm:text-lg font-bold text-purple-600">
              {totalPackageVisitsRemaining}
            </p>
          </div>
          <div>
            <p
              className={`text-[11px] uppercase tracking-wide ${selectedTheme === 'oscuro' ? 'text-gray-300' : 'text-gray-600'
                }`}
            >
              Anuncios creados
            </p>
            <p
              className={`text-base sm:text-lg font-bold ${selectedTheme === 'oscuro' ? 'text-gray-200' : 'text-gray-800'
                }`}
            >
              {simulationState.userAds.length}/
              {(currentRankData?.adPackages || 0) + purchasedPackages}
            </p>
          </div>
        </div>
      </div>

      {/* Paquetes adicionales comprados */}
      <div
        className={`border rounded-xl p-4 ${selectedTheme === 'oscuro'
            ? 'bg-gray-800 border-purple-700/60'
            : 'bg-purple-50 border-purple-200'
          }`}
      >
        <h4
          className={`font-semibold mb-2 ${selectedTheme === 'oscuro' ? 'text-white' : 'text-gray-800'
            }`}
        >
          Paquetes adicionales comprados
        </h4>

        {purchasedPackages === 0 ? (
          <p
            className={`text-sm ${selectedTheme === 'oscuro' ? 'text-gray-300' : 'text-gray-700'
              }`}
          >
            Aún no has comprado paquetes de visitas en la tienda. Cuando compres
            uno, aparecerá aquí y aumentará la cantidad de anuncios que puedes
            crear y las visitas disponibles.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm items-center">
            <div>
              <p
                className={`text-xs ${selectedTheme === 'oscuro'
                    ? 'text-gray-300'
                    : 'text-gray-600'
                  }`}
              >
                Paquetes comprados
              </p>
              <p className="text-base sm:text-lg font-bold text-purple-600">
                {purchasedPackages}
              </p>
            </div>
            <div>
              <p
                className={`text-xs ${selectedTheme === 'oscuro'
                    ? 'text-gray-300'
                    : 'text-gray-600'
                  }`}
              >
                Visitas restantes en paquetes
              </p>
              <p
                className={`text-base sm:text-lg font-bold ${selectedTheme === 'oscuro'
                    ? 'text-purple-300'
                    : 'text-purple-700'
                  }`}
              >
                {totalPackageVisitsRemaining}
              </p>
            </div>
            <div className="col-span-2 sm:col-span-1 flex justify-start sm:justify-end">
              <button
                onClick={handlePublishUsingPackage}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-purple-600 hover:bg-purple-700 text-white cursor-pointer"
              >
                Publicar anuncio
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Lista de anuncios del usuario */}
      {simulationState.userAds.length === 0 ? (
        <div className="text-center py-8 sm:py-12">
          <div
            className={`${selectedTheme === 'oscuro' ? 'bg-gray-600' : 'bg-gray-200'
              } rounded-full flex items-center justify-center mx-auto mb-4 w-12 h-12`}
          >
            <i
              className={`ri-billboard-line text-2xl ${selectedTheme === 'oscuro' ? 'text-gray-300' : 'text-gray-500'
                }`}
            />
          </div>
          <p
            className={`${selectedTheme === 'oscuro' ? 'text-gray-200' : 'text-gray-700'
              } mb-2`}
          >
            No has creado anuncios aún.
          </p>
          <p
            className={`text-xs ${selectedTheme === 'oscuro' ? 'text-gray-400' : 'text-gray-500'
              } mb-4`}
          >
            Crea tu primer anuncio para aprovechar tu plan de visitas mensuales
            y los paquetes que compres en la tienda.
          </p>
          {canCreateAd() && (
            <button
              onClick={() => setShowCreateAdForm(true)}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer text-sm font-medium"
            >
              Crear mi primer anuncio
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {simulationState.userAds.map((ad) => {
            const planRemaining = Math.max(ad.maxViews - ad.viewsUsed, 0);
            return (
              <div
                key={ad.id}
                className={`${selectedTheme === 'oscuro'
                    ? 'bg-gray-800 border-gray-700'
                    : 'bg-white border-gray-200'
                  } border rounded-xl p-4 sm:p-6`}
              >
                <div className="flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4
                        className={`font-semibold mb-1 ${selectedTheme === 'oscuro'
                            ? 'text-white'
                            : 'text-gray-900'
                          }`}
                      >
                        {ad.title}
                      </h4>
                      <p
                        className={`text-xs sm:text-sm ${selectedTheme === 'oscuro'
                            ? 'text-gray-300'
                            : 'text-gray-600'
                          }`}
                      >
                        {ad.description}
                      </p>
                      <a
                        href={ad.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex items-center gap-1 text-xs sm:text-sm font-medium cursor-pointer ${selectedTheme === 'oscuro'
                            ? 'text-blue-300 hover:text-blue-200'
                            : 'text-blue-600 hover:text-blue-700'
                          }`}
                      >
                        Ver anuncio
                        <i className="ri-external-link-line text-xs" />
                      </a>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-[11px] uppercase tracking-wide ${selectedTheme === 'oscuro'
                            ? 'text-gray-400'
                            : 'text-gray-500'
                          }`}
                      >
                        Estado
                      </p>
                      <p
                        className={`text-xs font-semibold ${selectedTheme === 'oscuro'
                            ? 'text-green-300'
                            : 'text-green-600'
                          }`}
                      >
                        {ad.isActive ? 'Activo' : 'Pausado'}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs sm:text-sm">
                    <div>
                      <p
                        className={`text-[11px] uppercase tracking-wide ${selectedTheme === 'oscuro'
                            ? 'text-gray-400'
                            : 'text-gray-500'
                          }`}
                      >
                        Visitas restantes (plan)
                      </p>
                      <p
                        className={`font-semibold ${selectedTheme === 'oscuro'
                            ? 'text-gray-200'
                            : 'text-gray-800'
                          }`}
                      >
                        {planRemaining}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // ---- MODAL CREAR ANUNCIO ----
  const renderCreateAdModal = () => {
    if (!showCreateAdForm) return null;

    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4">
        <div
          className={`w-full max-w-lg rounded-2xl p-4 sm:p-6 ${selectedTheme === 'oscuro' ? 'bg-gray-900' : 'bg-white'
            }`}
        >
          <div className="flex items-center justify-between mb-4">
            <h3
              className={`text-lg font-bold ${selectedTheme === 'oscuro' ? 'text-white' : 'text-gray-900'
                }`}
            >
              Crear anuncio
            </h3>
            <button
              onClick={() => setShowCreateAdForm(false)}
              className="text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <i className="ri-close-line text-xl" />
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium mb-1">
                Título del anuncio
              </label>
              <input
                type="text"
                value={adForm.title}
                onChange={(e) =>
                  setAdForm((prev) => ({ ...prev, title: e.target.value }))
                }
                className={`w-full px-3 py-2 rounded-lg text-sm border outline-none ${selectedTheme === 'oscuro'
                    ? 'bg-gray-800 border-gray-700 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                  }`}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">
                Descripción
              </label>
              <textarea
                value={adForm.description}
                onChange={(e) =>
                  setAdForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                className={`w-full px-3 py-2 rounded-lg text-sm border outline-none resize-none h-20 ${selectedTheme === 'oscuro'
                    ? 'bg-gray-800 border-gray-700 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                  }`}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">
                URL de destino
              </label>
              <input
                type="url"
                value={adForm.url}
                onChange={(e) =>
                  setAdForm((prev) => ({ ...prev, url: e.target.value }))
                }
                className={`w-full px-3 py-2 rounded-lg text-sm border outline-none ${selectedTheme === 'oscuro'
                    ? 'bg-gray-800 border-gray-700 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                  }`}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-4">
            <button
              onClick={() => setShowCreateAdForm(false)}
              className={`px-4 py-2 rounded-lg text-sm border cursor-pointer ${selectedTheme === 'oscuro'
                  ? 'border-gray-600 text-gray-300'
                  : 'border-gray-300 text-gray-700'
                }`}
            >
              Cancelar
            </button>
            <button
              onClick={handleCreateAd}
              className="px-4 py-2 rounded-lg text-sm bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
            >
              Publicar
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Tabs */}
      <div
        className={`inline-flex rounded-full p-1 border ${selectedTheme === 'oscuro'
            ? 'bg-gray-900 border-gray-700'
            : 'bg-gray-100 border-gray-200'
          }`}
      >
        <button
          onClick={() => setActiveSubTab('ver-anuncios')}
          className={`px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium cursor-pointer ${activeSubTab === 'ver-anuncios'
              ? 'bg-blue-600 text-white shadow-sm'
              : selectedTheme === 'oscuro'
                ? 'text-gray-300'
                : 'text-gray-600'
            }`}
        >
          Ver anuncios
        </button>
        <button
          onClick={() => setActiveSubTab('mis-anuncios')}
          className={`px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium cursor-pointer ${activeSubTab === 'mis-anuncios'
              ? 'bg-blue-600 text-white shadow-sm'
              : selectedTheme === 'oscuro'
                ? 'text-gray-300'
                : 'text-gray-600'
            }`}
        >
          Mis anuncios
        </button>
      </div>

      {/* Contenido */}
      <div
        className={`rounded-xl border ${selectedTheme === 'oscuro'
            ? 'bg-gray-900/60 border-gray-700'
            : 'bg-white border-gray-200'
          } p-4 sm:p-6`}
      >
        {activeSubTab === 'ver-anuncios' && renderVerAnuncios()}
        {activeSubTab === 'mis-anuncios' && renderMisAnuncios()}
      </div>

      {renderCreateAdModal()}
    </div>
  );
};

export default PublicidadSection;
