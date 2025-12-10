'use client';

import React from 'react';
import { formatSecondsAsHours } from '@/lib/economyConfig';

interface RefreshConfirmModalProps {
  show: boolean;
  onClose: () => void;
  onConfirm: () => void;
  currentPoints: number;
  cost: number;
  ceilingSeconds: number;
  currentTimeSeconds: number;
  timeToAddSeconds: number;
  isLoading?: boolean;
}

export default function RefreshConfirmModal({
  show,
  onClose,
  onConfirm,
  currentPoints,
  cost,
  ceilingSeconds,
  currentTimeSeconds,
  timeToAddSeconds,
  isLoading = false,
}: RefreshConfirmModalProps) {
  if (!show) return null;

  const pointsAfter = currentPoints - cost;
  const newTimeSeconds = Math.min(currentTimeSeconds + timeToAddSeconds, ceilingSeconds);
  const timeAdded = newTimeSeconds - currentTimeSeconds;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="ri-refresh-line text-3xl text-blue-600"></i>
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">
            Confirmar Refrescar Temporizador
          </h3>
          <p className="text-sm text-gray-600">
            ¿Estás seguro de que deseas refrescar tu temporizador?
          </p>
        </div>

        <div className="space-y-4 mb-6">
          {/* Puntos actuales */}
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <span className="text-gray-600 font-medium">Puntos actuales:</span>
            <span className="text-gray-800 font-bold">{currentPoints} pts</span>
          </div>

          {/* Costo */}
          <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg border border-red-200">
            <span className="text-red-700 font-medium">Costo:</span>
            <span className="text-red-700 font-bold">-{cost} pts</span>
          </div>

          {/* Puntos restantes */}
          <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg border border-green-200">
            <span className="text-green-700 font-medium">Puntos después:</span>
            <span className="text-green-700 font-bold">{pointsAfter} pts</span>
          </div>

          <div className="border-t border-gray-200 my-4"></div>

          {/* Tiempo actual */}
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <span className="text-gray-600 font-medium">Tiempo actual:</span>
            <span className="text-gray-800 font-bold">{formatSecondsAsHours(currentTimeSeconds)}</span>
          </div>

          {/* Tiempo a agregar */}
          <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg border border-blue-200">
            <span className="text-blue-700 font-medium">Tiempo a agregar:</span>
            <span className="text-blue-700 font-bold">+{formatSecondsAsHours(timeAdded)}</span>
          </div>

          {/* Nuevo tiempo estimado */}
          <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg border border-green-200">
            <span className="text-green-700 font-medium">Nuevo tiempo estimado:</span>
            <span className="text-green-700 font-bold">{formatSecondsAsHours(newTimeSeconds)}</span>
          </div>

          {/* Techo máximo */}
          <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg border border-purple-200">
            <span className="text-purple-700 font-medium">Techo máximo (rango):</span>
            <span className="text-purple-700 font-bold">{formatSecondsAsHours(ceilingSeconds)}</span>
          </div>

          {/* Advertencia importante */}
          <div className="p-4 bg-yellow-50 rounded-lg border-2 border-yellow-300">
            <div className="flex items-start space-x-2">
              <i className="ri-alert-line text-yellow-600 text-xl mt-0.5"></i>
              <div className="flex-1">
                <p className="text-sm text-yellow-900 font-medium leading-relaxed">
                  Este botón extiende tu contador hasta 48 horas adicionales, pero nunca puede superar el límite máximo de tu rango.
                </p>
                {newTimeSeconds >= ceilingSeconds && (
                  <p className="text-xs text-yellow-800 mt-2 font-semibold">
                    ⚠️ Alcanzarás el límite máximo de tu rango actual.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-6 py-3 rounded-lg font-medium transition-colors bg-gray-300 text-gray-700 hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 px-6 py-3 rounded-lg font-medium transition-colors bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <i className="ri-loader-4-line animate-spin mr-2"></i>
                Procesando...
              </>
            ) : (
              <>
                <i className="ri-check-line mr-2"></i>
                Confirmar
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
