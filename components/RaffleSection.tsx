'use client'

/**
 * Componente para SORTEOS (pago con puntos)
 * Disponible desde rango Invitado en adelante
 */

import React, { useState, useEffect } from 'react'
import { buyRaffleWeeklyTicket, buyRaffleMonthlyTicket, getActiveDraw } from '@/app/actions/draws'
import { RAFFLE_CONFIG, canParticipateInDraw, type UserRank } from '@/lib/economyConfig'

type Props = {
  userId: string
  userRank: UserRank
  points: number
  selectedTheme?: string
}

export default function RaffleSection({ userId, userRank, points, selectedTheme = 'claro' }: Props) {
  const [busy, setBusy] = useState<'weekly' | 'monthly' | null>(null)
  const [weeklyDraw, setWeeklyDraw] = useState<any>(null)
  const [monthlyDraw, setMonthlyDraw] = useState<any>(null)

  const canSeeRaffles = canParticipateInDraw(userRank, RAFFLE_CONFIG.weekly.minRank)

  useEffect(() => {
    if (canSeeRaffles) {
      loadActiveDraws()
    }
  }, [canSeeRaffles])

  const loadActiveDraws = async () => {
    try {
      const [weeklyRes, monthlyRes] = await Promise.all([
        getActiveDraw('raffle_weekly'),
        getActiveDraw('raffle_monthly'),
      ])
      if (weeklyRes.ok) setWeeklyDraw(weeklyRes.draw)
      if (monthlyRes.ok) setMonthlyDraw(monthlyRes.draw)
    } catch (error) {
      console.error('Error loading draws:', error)
    }
  }

  if (!canSeeRaffles) {
    return (
      <div
        className={`${selectedTheme === 'oscuro' ? 'bg-gray-700 border-gray-600' : 'bg-orange-50 border-orange-200'} border rounded-xl p-6 text-center`}
      >
        <i className="ri-lock-line text-4xl text-orange-500 mb-3"></i>
        <h4 className="text-lg font-bold text-orange-600 mb-2">Sorteos Bloqueados</h4>
        <p className={`text-sm ${selectedTheme === 'oscuro' ? 'text-gray-300' : 'text-gray-600'}`}>
          Debes ser al menos rango <strong>Invitado</strong> para acceder a los sorteos.
        </p>
      </div>
    )
  }

  const handleBuyWeekly = async () => {
    if (busy) return
    setBusy('weekly')
    try {
      const res = await buyRaffleWeeklyTicket(userId)
      if (res.ok) {
        // @ts-ignore
        window?.YigiToast?.success?.(res.message ?? 'Boleto de sorteo semanal comprado')
        await loadActiveDraws()
      } else {
        // @ts-ignore
        window?.YigiToast?.error?.(res.error ?? 'No se pudo comprar el boleto')
      }
    } catch (error: any) {
      // @ts-ignore
      window?.YigiToast?.error?.(error.message ?? 'Error al comprar boleto')
    } finally {
      setBusy(null)
    }
  }

  const handleBuyMonthly = async () => {
    if (busy) return
    setBusy('monthly')
    try {
      const res = await buyRaffleMonthlyTicket(userId)
      if (res.ok) {
        // @ts-ignore
        window?.YigiToast?.success?.(res.message ?? 'Boleto de sorteo mensual comprado')
        await loadActiveDraws()
      } else {
        // @ts-ignore
        window?.YigiToast?.error?.(res.error ?? 'No se pudo comprar el boleto')
      }
    } catch (error: any) {
      // @ts-ignore
      window?.YigiToast?.error?.(error.message ?? 'Error al comprar boleto')
    } finally {
      setBusy(null)
    }
  }

  const formatDate = (date: Date | string) => {
    const d = new Date(date)
    return d.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h3
          className={`text-lg sm:text-xl font-bold ${selectedTheme === 'oscuro' ? 'text-white' : 'text-gray-800'}`}
        >
          Sorteos YigiCoin (con Puntos)
        </h3>
        <div
          className={`${selectedTheme === 'oscuro' ? 'bg-gray-700 border-gray-600' : 'bg-yellow-50 border-yellow-200'} border rounded-lg px-4 py-2`}
        >
          <p className="text-xs font-medium text-gray-600">Tus Puntos</p>
          <p className="text-lg font-bold text-yellow-600">
            <i className="ri-star-line mr-1"></i>
            {points.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {/* Sorteo Semanal */}
        <div
          className={`bg-gradient-to-br ${
            selectedTheme === 'oscuro'
              ? 'from-gray-700 to-gray-800 border-gray-600'
              : 'from-blue-50 to-blue-100 border-blue-200'
          } border rounded-xl p-4 sm:p-6`}
        >
          <div className="text-center mb-4">
            <div className="w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-4xl">{RAFFLE_CONFIG.weekly.icon}</span>
            </div>
            <h4
              className={`text-lg font-bold ${selectedTheme === 'oscuro' ? 'text-blue-400' : 'text-blue-800'}`}
            >
              {RAFFLE_CONFIG.weekly.name}
            </h4>
            <p
              className={`text-sm ${selectedTheme === 'oscuro' ? 'text-blue-300' : 'text-blue-600'}`}
            >
              {RAFFLE_CONFIG.weekly.description}
            </p>
          </div>

          <div className="space-y-3">
            <div
              className={`${selectedTheme === 'oscuro' ? 'bg-gray-600 border-gray-500' : 'bg-white border-blue-100'} rounded-lg p-3 border`}
            >
              <p
                className={`text-sm font-medium mb-1 ${selectedTheme === 'oscuro' ? 'text-gray-300' : 'text-gray-700'}`}
              >
                Premio Principal
              </p>
              <p className="text-2xl font-bold text-green-600">
                ${RAFFLE_CONFIG.weekly.prizeAmount} USD
              </p>
            </div>

            <div
              className={`${selectedTheme === 'oscuro' ? 'bg-gray-600 border-gray-500' : 'bg-white border-blue-100'} rounded-lg p-3 border`}
            >
              <p
                className={`text-sm font-medium mb-1 ${selectedTheme === 'oscuro' ? 'text-gray-300' : 'text-gray-700'}`}
              >
                Costo por Boleto
              </p>
              <p className="text-xl font-bold text-blue-600">
                <i className="ri-star-line mr-1"></i>
                {RAFFLE_CONFIG.weekly.ticketCostPoints} puntos
              </p>
            </div>

            {weeklyDraw && (
              <>
                <div
                  className={`${selectedTheme === 'oscuro' ? 'bg-gray-600 border-gray-500' : 'bg-white border-blue-100'} rounded-lg p-3 border`}
                >
                  <p
                    className={`text-sm font-medium mb-1 ${selectedTheme === 'oscuro' ? 'text-gray-300' : 'text-gray-700'}`}
                  >
                    Próximo Sorteo
                  </p>
                  <p
                    className={`text-sm ${selectedTheme === 'oscuro' ? 'text-gray-400' : 'text-gray-600'}`}
                  >
                    {formatDate(weeklyDraw.drawDate)}
                  </p>
                </div>

                <div
                  className={`${selectedTheme === 'oscuro' ? 'bg-gray-600 border-gray-500' : 'bg-white border-blue-100'} rounded-lg p-3 border`}
                >
                  <p
                    className={`text-sm font-medium mb-1 ${selectedTheme === 'oscuro' ? 'text-gray-300' : 'text-gray-700'}`}
                  >
                    Boletos Vendidos
                  </p>
                  <p
                    className={`text-sm ${selectedTheme === 'oscuro' ? 'text-gray-400' : 'text-gray-600'}`}
                  >
                    {weeklyDraw.ticketCount || 0} participantes
                  </p>
                </div>
              </>
            )}

            <div
              className={`${selectedTheme === 'oscuro' ? 'bg-gray-600 border-gray-500' : 'bg-white border-blue-100'} rounded-lg p-3 border`}
            >
              <p className={`text-xs ${selectedTheme === 'oscuro' ? 'text-gray-400' : 'text-gray-600'}`}>
                🎯 Sorteo cada viernes a las 00:00
              </p>
              <p className={`text-xs ${selectedTheme === 'oscuro' ? 'text-gray-400' : 'text-gray-600'}`}>
                💰 Premio se acumula si no hay ganador
              </p>
            </div>

            {points >= RAFFLE_CONFIG.weekly.ticketCostPoints ? (
              <button
                onClick={handleBuyWeekly}
                disabled={busy === 'weekly'}
                className={`w-full bg-blue-600 text-white py-3 rounded-lg font-medium transition-colors ${
                  busy === 'weekly' ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700 cursor-pointer'
                }`}
              >
                {busy === 'weekly' ? (
                  <>
                    <i className="ri-loader-4-line animate-spin mr-2"></i>
                    Comprando...
                  </>
                ) : (
                  <>
                    <i className="ri-ticket-line mr-2"></i>
                    Comprar Boleto
                  </>
                )}
              </button>
            ) : (
              <div
                className={`${selectedTheme === 'oscuro' ? 'bg-gray-600' : 'bg-red-50'} rounded-lg p-3 border border-red-200`}
              >
                <p className="text-sm text-red-600 font-medium">
                  <i className="ri-error-warning-line mr-1"></i>
                  Puntos insuficientes
                </p>
                <p className="text-xs text-red-500 mt-1">
                  Te faltan {RAFFLE_CONFIG.weekly.ticketCostPoints - points} puntos
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Sorteo Mensual */}
        <div
          className={`bg-gradient-to-br ${
            selectedTheme === 'oscuro'
              ? 'from-gray-700 to-gray-800 border-gray-600'
              : 'from-purple-50 to-purple-100 border-purple-200'
          } border rounded-xl p-4 sm:p-6`}
        >
          <div className="text-center mb-4">
            <div className="w-20 h-20 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-4xl">{RAFFLE_CONFIG.monthly.icon}</span>
            </div>
            <h4
              className={`text-lg font-bold ${selectedTheme === 'oscuro' ? 'text-purple-400' : 'text-purple-800'}`}
            >
              {RAFFLE_CONFIG.monthly.name}
            </h4>
            <p
              className={`text-sm ${selectedTheme === 'oscuro' ? 'text-purple-300' : 'text-purple-600'}`}
            >
              {RAFFLE_CONFIG.monthly.description}
            </p>
          </div>

          <div className="space-y-3">
            <div
              className={`${selectedTheme === 'oscuro' ? 'bg-gray-600 border-gray-500' : 'bg-white border-purple-100'} rounded-lg p-3 border`}
            >
              <p
                className={`text-sm font-medium mb-1 ${selectedTheme === 'oscuro' ? 'text-gray-300' : 'text-gray-700'}`}
              >
                Premio Principal
              </p>
              <p className="text-2xl font-bold text-green-600">
                ${RAFFLE_CONFIG.monthly.prizeAmount} USD
              </p>
            </div>

            <div
              className={`${selectedTheme === 'oscuro' ? 'bg-gray-600 border-gray-500' : 'bg-white border-purple-100'} rounded-lg p-3 border`}
            >
              <p
                className={`text-sm font-medium mb-1 ${selectedTheme === 'oscuro' ? 'text-gray-300' : 'text-gray-700'}`}
              >
                Costo por Boleto
              </p>
              <p className="text-xl font-bold text-purple-600">
                <i className="ri-star-line mr-1"></i>
                {RAFFLE_CONFIG.monthly.ticketCostPoints} puntos
              </p>
            </div>

            {monthlyDraw && (
              <>
                <div
                  className={`${selectedTheme === 'oscuro' ? 'bg-gray-600 border-gray-500' : 'bg-white border-purple-100'} rounded-lg p-3 border`}
                >
                  <p
                    className={`text-sm font-medium mb-1 ${selectedTheme === 'oscuro' ? 'text-gray-300' : 'text-gray-700'}`}
                  >
                    Próximo Sorteo
                  </p>
                  <p
                    className={`text-sm ${selectedTheme === 'oscuro' ? 'text-gray-400' : 'text-gray-600'}`}
                  >
                    {formatDate(monthlyDraw.drawDate)}
                  </p>
                </div>

                <div
                  className={`${selectedTheme === 'oscuro' ? 'bg-gray-600 border-gray-500' : 'bg-white border-purple-100'} rounded-lg p-3 border`}
                >
                  <p
                    className={`text-sm font-medium mb-1 ${selectedTheme === 'oscuro' ? 'text-gray-300' : 'text-gray-700'}`}
                  >
                    Boletos Vendidos
                  </p>
                  <p
                    className={`text-sm ${selectedTheme === 'oscuro' ? 'text-gray-400' : 'text-gray-600'}`}
                  >
                    {monthlyDraw.ticketCount || 0} participantes
                  </p>
                </div>
              </>
            )}

            <div
              className={`${selectedTheme === 'oscuro' ? 'bg-gray-600 border-gray-500' : 'bg-white border-purple-100'} rounded-lg p-3 border`}
            >
              <p className={`text-xs ${selectedTheme === 'oscuro' ? 'text-gray-400' : 'text-gray-600'}`}>
                🎯 Sorteo el último viernes de cada mes
              </p>
              <p className={`text-xs ${selectedTheme === 'oscuro' ? 'text-gray-400' : 'text-gray-600'}`}>
                💎 Premio más grande que el semanal
              </p>
            </div>

            {points >= RAFFLE_CONFIG.monthly.ticketCostPoints ? (
              <button
                onClick={handleBuyMonthly}
                disabled={busy === 'monthly'}
                className={`w-full bg-purple-600 text-white py-3 rounded-lg font-medium transition-colors ${
                  busy === 'monthly' ? 'opacity-50 cursor-not-allowed' : 'hover:bg-purple-700 cursor-pointer'
                }`}
              >
                {busy === 'monthly' ? (
                  <>
                    <i className="ri-loader-4-line animate-spin mr-2"></i>
                    Comprando...
                  </>
                ) : (
                  <>
                    <i className="ri-ticket-line mr-2"></i>
                    Comprar Boleto
                  </>
                )}
              </button>
            ) : (
              <div
                className={`${selectedTheme === 'oscuro' ? 'bg-gray-600' : 'bg-red-50'} rounded-lg p-3 border border-red-200`}
              >
                <p className="text-sm text-red-600 font-medium">
                  <i className="ri-error-warning-line mr-1"></i>
                  Puntos insuficientes
                </p>
                <p className="text-xs text-red-500 mt-1">
                  Te faltan {RAFFLE_CONFIG.monthly.ticketCostPoints - points} puntos
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
