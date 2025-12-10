'use client'
import React, { useState } from 'react'
import { buyLotteryTicket } from '@/app/actions/lottery'
import { LOTTERY_CONFIG } from '@/lib/economyConfig'

type Props = {
  userId: string
  userRank: 'registrado' | 'invitado' | 'miembro' | 'vip' | 'premium' | 'elite'
  points: number
  selectedTheme?: string
}

const rankOrder = ['registrado', 'invitado', 'miembro', 'vip', 'premium', 'elite'] as const
const rankGte = (a: Props['userRank'], b: Props['userRank']) =>
  rankOrder.indexOf(a) >= rankOrder.indexOf(b)

export default function LotterySection({ userId, userRank, points, selectedTheme = 'claro' }: Props) {
  const [busy, setBusy] = useState<'weekly' | 'monthly' | null>(null)
  const canSee = rankGte(userRank, 'invitado')

  if (!canSee) {
    return (
      <div
        className={`${selectedTheme === 'oscuro' ? 'bg-gray-700 border-gray-600' : 'bg-orange-50 border-orange-200'} border rounded-xl p-6 text-center`}
      >
        <i className="ri-lock-line text-4xl text-orange-500 mb-3"></i>
        <h4 className="text-lg font-bold text-orange-600 mb-2">Lotería Bloqueada</h4>
        <p className={`text-sm mb-4 ${selectedTheme === 'oscuro' ? 'text-gray-300' : 'text-gray-600'}`}>
          Debes ser al menos rango <strong>Invitado</strong> para acceder a la lotería.
        </p>
        <button
          className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700 transition-colors font-medium"
          onClick={() => {
            // In a real app, this would navigate to the upgrade page
            alert('Función de ascender de rango')
          }}
        >
          Subir a Invitado
        </button>
      </div>
    )
  }

  const onBuyWeekly = async () => {
    try {
      setBusy('weekly')
      const res = await buyLotteryTicket(userId, 'weekly')
      if (res.ok) {
        // @ts-ignore
        window?.YigiToast?.success?.(res.message ?? 'Boleto semanal comprado (200 pts)')
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

  const onBuyMonthly = async () => {
    try {
      setBusy('monthly')
      const res = await buyLotteryTicket(userId, 'monthly')
      if (res.ok) {
        // @ts-ignore
        window?.YigiToast?.success?.(res.message ?? 'Boleto mensual comprado (800 pts)')
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

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h3
          className={`text-lg sm:text-xl font-bold ${selectedTheme === 'oscuro' ? 'text-white' : 'text-gray-800'}`}
        >
          Lotería YigiCoin
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
        {/* Weekly Lottery */}
        <div
          className={`bg-gradient-to-br ${selectedTheme === 'oscuro'
              ? 'from-gray-700 to-gray-800 border-gray-600'
              : 'from-blue-50 to-blue-100 border-blue-200'
            } border rounded-xl p-4 sm:p-6`}
        >
          <div className="text-center mb-4">
            <div className="w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-3">
              <i className="ri-gift-line text-3xl text-white"></i>
            </div>
            <h4
              className={`text-lg font-bold ${selectedTheme === 'oscuro' ? 'text-blue-400' : 'text-blue-800'}`}
            >
              {LOTTERY_CONFIG.weekly.name}
            </h4>
            <p
              className={`text-sm ${selectedTheme === 'oscuro' ? 'text-blue-300' : 'text-blue-600'}`}
            >
              {LOTTERY_CONFIG.weekly.description}
            </p>
          </div>

          <div className="space-y-3">
            <div
              className={`${selectedTheme === 'oscuro' ? 'bg-gray-600 border-gray-500' : 'bg-white border-blue-100'} rounded-lg p-3 border`}
            >
              <p
                className={`text-sm font-medium mb-1 ${selectedTheme === 'oscuro' ? 'text-gray-300' : 'text-gray-700'}`}
              >
                Precio
              </p>
              <p className="text-2xl font-bold text-blue-600">
                <i className="ri-star-line mr-1"></i>
                {LOTTERY_CONFIG.weekly.cost} pts
              </p>
            </div>

            <div
              className={`${selectedTheme === 'oscuro' ? 'bg-gray-600 border-gray-500' : 'bg-white border-blue-100'} rounded-lg p-3 border`}
            >
              <p
                className={`text-sm font-medium mb-1 ${selectedTheme === 'oscuro' ? 'text-gray-300' : 'text-gray-700'}`}
              >
                Premio Principal
              </p>
              <p className="text-lg font-bold text-green-600">$500 USD</p>
            </div>

            <div
              className={`${selectedTheme === 'oscuro' ? 'bg-gray-600 border-gray-500' : 'bg-white border-blue-100'} rounded-lg p-3 border`}
            >
              <p className={`text-xs ${selectedTheme === 'oscuro' ? 'text-gray-400' : 'text-gray-600'}`}>
                🎯 Sorteo cada domingo
              </p>
              <p className={`text-xs ${selectedTheme === 'oscuro' ? 'text-gray-400' : 'text-gray-600'}`}>
                🎁 Múltiples premios
              </p>
            </div>

            {points >= LOTTERY_CONFIG.weekly.cost ? (
              <button
                onClick={onBuyWeekly}
                disabled={busy === 'weekly'}
                className={`w-full bg-blue-600 text-white py-3 rounded-lg font-medium transition-colors ${busy === 'weekly' ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700 cursor-pointer'
                  }`}
              >
                {busy === 'weekly' ? (
                  <>
                    <i className="ri-loader-4-line animate-spin mr-2"></i>
                    Comprando...
                  </>
                ) : (
                  <>
                    <i className="ri-shopping-cart-line mr-2"></i>
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
                  Te faltan {LOTTERY_CONFIG.weekly.cost - points} puntos
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Monthly Lottery */}
        <div
          className={`bg-gradient-to-br ${selectedTheme === 'oscuro'
              ? 'from-gray-700 to-gray-800 border-gray-600'
              : 'from-purple-50 to-purple-100 border-purple-200'
            } border rounded-xl p-4 sm:p-6`}
        >
          <div className="text-center mb-4">
            <div className="w-20 h-20 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-3">
              <i className="ri-vip-crown-line text-3xl text-white"></i>
            </div>
            <h4
              className={`text-lg font-bold ${selectedTheme === 'oscuro' ? 'text-purple-400' : 'text-purple-800'}`}
            >
              {LOTTERY_CONFIG.monthly.name}
            </h4>
            <p
              className={`text-sm ${selectedTheme === 'oscuro' ? 'text-purple-300' : 'text-purple-600'}`}
            >
              {LOTTERY_CONFIG.monthly.description}
            </p>
          </div>

          <div className="space-y-3">
            <div
              className={`${selectedTheme === 'oscuro' ? 'bg-gray-600 border-gray-500' : 'bg-white border-purple-100'} rounded-lg p-3 border`}
            >
              <p
                className={`text-sm font-medium mb-1 ${selectedTheme === 'oscuro' ? 'text-gray-300' : 'text-gray-700'}`}
              >
                Precio
              </p>
              <p className="text-2xl font-bold text-purple-600">
                <i className="ri-star-line mr-1"></i>
                {LOTTERY_CONFIG.monthly.cost} pts
              </p>
            </div>

            <div
              className={`${selectedTheme === 'oscuro' ? 'bg-gray-600 border-gray-500' : 'bg-white border-purple-100'} rounded-lg p-3 border`}
            >
              <p
                className={`text-sm font-medium mb-1 ${selectedTheme === 'oscuro' ? 'text-gray-300' : 'text-gray-700'}`}
              >
                Premio Principal
              </p>
              <p className="text-lg font-bold text-green-600">$2,000 USD</p>
            </div>

            <div
              className={`${selectedTheme === 'oscuro' ? 'bg-gray-600 border-gray-500' : 'bg-white border-purple-100'} rounded-lg p-3 border`}
            >
              <p className={`text-xs ${selectedTheme === 'oscuro' ? 'text-gray-400' : 'text-gray-600'}`}>
                🎯 Sorteo el último día del mes
              </p>
              <p className={`text-xs ${selectedTheme === 'oscuro' ? 'text-gray-400' : 'text-gray-600'}`}>
                💎 Premios especiales
              </p>
            </div>

            {points >= LOTTERY_CONFIG.monthly.cost ? (
              <button
                onClick={onBuyMonthly}
                disabled={busy === 'monthly'}
                className={`w-full bg-purple-600 text-white py-3 rounded-lg font-medium transition-colors ${busy === 'monthly' ? 'opacity-50 cursor-not-allowed' : 'hover:bg-purple-700 cursor-pointer'
                  }`}
              >
                {busy === 'monthly' ? (
                  <>
                    <i className="ri-loader-4-line animate-spin mr-2"></i>
                    Comprando...
                  </>
                ) : (
                  <>
                    <i className="ri-shopping-cart-line mr-2"></i>
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
                  Te faltan {LOTTERY_CONFIG.monthly.cost - points} puntos
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
