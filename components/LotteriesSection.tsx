'use client'

/**
 * Componente para LOTERÍAS (pago con Metamask)
 * - Loterías Normales: disponibles desde rango Miembro (basico) en adelante
 * - Loterías VIP: disponibles desde rango VIP en adelante
 */

import React, { useState, useEffect } from 'react'
import {
  buyLotteryWeeklyTicket,
  buyLotteryMonthlyTicket,
  buyLotteryVIPWeeklyTicket,
  buyLotteryVIPMonthlyTicket,
  getActiveDraw,
} from '@/app/actions/draws'
import {
  LOTTERY_NORMAL_CONFIG,
  LOTTERY_VIP_CONFIG,
  canParticipateInDraw,
  type UserRank,
} from '@/lib/economyConfig'

type Props = {
  userId: string
  userRank: UserRank
  selectedTheme?: string
}

export default function LotteriesSection({ userId, userRank, selectedTheme = 'claro' }: Props) {
  const [busy, setBusy] = useState<string | null>(null)
  const [showMetaMaskModal, setShowMetaMaskModal] = useState(false)
  const [selectedLottery, setSelectedLottery] = useState<any>(null)
  const [lotteryDraws, setLotteryDraws] = useState<Record<string, any>>({})

  const canSeeNormalLotteries = canParticipateInDraw(userRank, LOTTERY_NORMAL_CONFIG.weekly.minRank)
  const canSeeVIPLotteries = canParticipateInDraw(userRank, LOTTERY_VIP_CONFIG.weekly.minRank)

  useEffect(() => {
    if (canSeeNormalLotteries || canSeeVIPLotteries) {
      loadActiveDraws()
    }
  }, [canSeeNormalLotteries, canSeeVIPLotteries])

  const loadActiveDraws = async () => {
    try {
      const drawTypes = []
      if (canSeeNormalLotteries) {
        drawTypes.push('lottery_weekly', 'lottery_monthly')
      }
      if (canSeeVIPLotteries) {
        drawTypes.push('lottery_vip_weekly', 'lottery_vip_monthly')
      }

      const results = await Promise.all(drawTypes.map((type) => getActiveDraw(type)))
      
      const draws: Record<string, any> = {}
      drawTypes.forEach((type, index) => {
        if (results[index].ok) {
          draws[type] = results[index].draw
        }
      })
      
      setLotteryDraws(draws)
    } catch (error) {
      console.error('Error loading lottery draws:', error)
    }
  }

  const handleBuyLottery = async (config: any, buyFunction: any) => {
    if (busy) return
    
    // Mostrar modal de Metamask
    setSelectedLottery({ config, buyFunction })
    setShowMetaMaskModal(true)
  }

  const handleMetaMaskPayment = async () => {
    if (!selectedLottery || busy) return
    
    setBusy(selectedLottery.config.id)
    try {
      // Simular hash de transacción (en producción se obtendría de Metamask)
      const txHash = '0x' + Math.random().toString(16).slice(2) + Math.random().toString(16).slice(2)
      
      const res = await selectedLottery.buyFunction(userId, txHash)
      if (res.ok) {
        // @ts-ignore
        window?.YigiToast?.success?.(res.message ?? 'Boleto de lotería comprado')
        setShowMetaMaskModal(false)
        setSelectedLottery(null)
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

  const LotteryCard = ({ config, drawData, buyFunction, bgColor, iconColor }: any) => {
    const draw = lotteryDraws[config.id]
    
    return (
      <div
        className={`bg-gradient-to-br ${
          selectedTheme === 'oscuro'
            ? 'from-gray-700 to-gray-800 border-gray-600'
            : `from-${bgColor}-50 to-${bgColor}-100 border-${bgColor}-200`
        } border rounded-xl p-4 sm:p-6`}
      >
        <div className="text-center mb-4">
          <div className={`w-20 h-20 bg-${iconColor}-500 rounded-full flex items-center justify-center mx-auto mb-3`}>
            <span className="text-4xl">{config.icon}</span>
          </div>
          <h4
            className={`text-lg font-bold ${selectedTheme === 'oscuro' ? `text-${bgColor}-400` : `text-${bgColor}-800`}`}
          >
            {config.name}
          </h4>
          <p
            className={`text-sm ${selectedTheme === 'oscuro' ? `text-${bgColor}-300` : `text-${bgColor}-600`}`}
          >
            {config.description}
          </p>
        </div>

        <div className="space-y-3">
          <div
            className={`${selectedTheme === 'oscuro' ? 'bg-gray-600 border-gray-500' : `bg-white border-${bgColor}-100`} rounded-lg p-3 border`}
          >
            <p
              className={`text-sm font-medium mb-1 ${selectedTheme === 'oscuro' ? 'text-gray-300' : 'text-gray-700'}`}
            >
              Premio Principal
            </p>
            <p className="text-2xl font-bold text-green-600">
              ${config.prizeAmount.toLocaleString()} USD
            </p>
          </div>

          <div
            className={`${selectedTheme === 'oscuro' ? 'bg-gray-600 border-gray-500' : `bg-white border-${bgColor}-100`} rounded-lg p-3 border`}
          >
            <p
              className={`text-sm font-medium mb-1 ${selectedTheme === 'oscuro' ? 'text-gray-300' : 'text-gray-700'}`}
            >
              Costo por Boleto
            </p>
            <p className={`text-xl font-bold text-${iconColor}-600`}>
              ${config.ticketCostUSD} USD
            </p>
          </div>

          {draw && (
            <>
              <div
                className={`${selectedTheme === 'oscuro' ? 'bg-gray-600 border-gray-500' : `bg-white border-${bgColor}-100`} rounded-lg p-3 border`}
              >
                <p
                  className={`text-sm font-medium mb-1 ${selectedTheme === 'oscuro' ? 'text-gray-300' : 'text-gray-700'}`}
                >
                  Próximo Sorteo
                </p>
                <p
                  className={`text-sm ${selectedTheme === 'oscuro' ? 'text-gray-400' : 'text-gray-600'}`}
                >
                  {formatDate(draw.drawDate)}
                </p>
              </div>

              <div
                className={`${selectedTheme === 'oscuro' ? 'bg-gray-600 border-gray-500' : `bg-white border-${bgColor}-100`} rounded-lg p-3 border`}
              >
                <p
                  className={`text-sm font-medium mb-1 ${selectedTheme === 'oscuro' ? 'text-gray-300' : 'text-gray-700'}`}
                >
                  Boletos Vendidos
                </p>
                <p
                  className={`text-sm ${selectedTheme === 'oscuro' ? 'text-gray-400' : 'text-gray-600'}`}
                >
                  {draw.ticketCount || 0} participantes
                </p>
              </div>
            </>
          )}

          <div
            className={`${selectedTheme === 'oscuro' ? 'bg-gray-600 border-gray-500' : `bg-white border-${bgColor}-100`} rounded-lg p-3 border`}
          >
            <p className={`text-xs ${selectedTheme === 'oscuro' ? 'text-gray-400' : 'text-gray-600'}`}>
              💳 Pago con Metamask
            </p>
            <p className={`text-xs ${selectedTheme === 'oscuro' ? 'text-gray-400' : 'text-gray-600'}`}>
              🎯 Sorteo cada viernes a las 00:00
            </p>
          </div>

          <button
            onClick={() => handleBuyLottery(config, buyFunction)}
            disabled={busy === config.id}
            className={`w-full bg-${iconColor}-600 text-white py-3 rounded-lg font-medium transition-colors ${
              busy === config.id ? 'opacity-50 cursor-not-allowed' : `hover:bg-${iconColor}-700 cursor-pointer`
            }`}
          >
            {busy === config.id ? (
              <>
                <i className="ri-loader-4-line animate-spin mr-2"></i>
                Procesando...
              </>
            ) : (
              <>
                <i className="ri-wallet-line mr-2"></i>
                Comprar con Metamask
              </>
            )}
          </button>
        </div>
      </div>
    )
  }

  if (!canSeeNormalLotteries && !canSeeVIPLotteries) {
    return (
      <div
        className={`${selectedTheme === 'oscuro' ? 'bg-gray-700 border-gray-600' : 'bg-orange-50 border-orange-200'} border rounded-xl p-6 text-center`}
      >
        <i className="ri-lock-line text-4xl text-orange-500 mb-3"></i>
        <h4 className="text-lg font-bold text-orange-600 mb-2">Loterías Bloqueadas</h4>
        <p className={`text-sm ${selectedTheme === 'oscuro' ? 'text-gray-300' : 'text-gray-600'}`}>
          Debes ser al menos rango <strong>Miembro</strong> para acceder a las loterías.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Modal de Metamask */}
      {showMetaMaskModal && selectedLottery && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div
            className={`${selectedTheme === 'oscuro' ? 'bg-gray-800' : 'bg-white'} rounded-xl p-6 max-w-md w-full`}
          >
            <h3
              className={`text-xl font-bold mb-4 ${selectedTheme === 'oscuro' ? 'text-white' : 'text-gray-800'}`}
            >
              Pago con Metamask
            </h3>
            <div className="space-y-4">
              <div
                className={`${selectedTheme === 'oscuro' ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg p-4`}
              >
                <p
                  className={`text-sm ${selectedTheme === 'oscuro' ? 'text-gray-300' : 'text-gray-600'} mb-2`}
                >
                  Lotería: <strong>{selectedLottery.config.name}</strong>
                </p>
                <p
                  className={`text-sm ${selectedTheme === 'oscuro' ? 'text-gray-300' : 'text-gray-600'} mb-2`}
                >
                  Monto: <strong>${selectedLottery.config.ticketCostUSD} USD</strong>
                </p>
                <p
                  className={`text-sm ${selectedTheme === 'oscuro' ? 'text-gray-300' : 'text-gray-600'}`}
                >
                  Premio: <strong>${selectedLottery.config.prizeAmount.toLocaleString()} USD</strong>
                </p>
              </div>

              <div
                className={`${selectedTheme === 'oscuro' ? 'bg-blue-900 border-blue-700' : 'bg-blue-50 border-blue-200'} border rounded-lg p-3`}
              >
                <p className={`text-sm ${selectedTheme === 'oscuro' ? 'text-blue-300' : 'text-blue-700'}`}>
                  ℹ️ Se abrirá Metamask para confirmar el pago. Asegúrate de tener fondos suficientes.
                </p>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowMetaMaskModal(false)
                    setSelectedLottery(null)
                  }}
                  className={`flex-1 ${selectedTheme === 'oscuro' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} py-2 rounded-lg font-medium transition-colors`}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleMetaMaskPayment}
                  disabled={busy !== null}
                  className={`flex-1 bg-orange-600 text-white py-2 rounded-lg font-medium transition-colors ${
                    busy !== null ? 'opacity-50 cursor-not-allowed' : 'hover:bg-orange-700 cursor-pointer'
                  }`}
                >
                  {busy !== null ? 'Procesando...' : 'Pagar con Metamask'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loterías Normales */}
      {canSeeNormalLotteries && (
        <div>
          <h3
            className={`text-lg sm:text-xl font-bold mb-4 ${selectedTheme === 'oscuro' ? 'text-white' : 'text-gray-800'}`}
          >
            Loterías Normales (Miembro+)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <LotteryCard
              config={LOTTERY_NORMAL_CONFIG.weekly}
              buyFunction={buyLotteryWeeklyTicket}
              bgColor="green"
              iconColor="green"
            />
            <LotteryCard
              config={LOTTERY_NORMAL_CONFIG.monthly}
              buyFunction={buyLotteryMonthlyTicket}
              bgColor="emerald"
              iconColor="emerald"
            />
          </div>
        </div>
      )}

      {/* Loterías VIP */}
      {canSeeVIPLotteries && (
        <div>
          <h3
            className={`text-lg sm:text-xl font-bold mb-4 ${selectedTheme === 'oscuro' ? 'text-white' : 'text-gray-800'}`}
          >
            Loterías VIP (VIP+)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <LotteryCard
              config={LOTTERY_VIP_CONFIG.weekly}
              buyFunction={buyLotteryVIPWeeklyTicket}
              bgColor="yellow"
              iconColor="yellow"
            />
            <LotteryCard
              config={LOTTERY_VIP_CONFIG.monthly}
              buyFunction={buyLotteryVIPMonthlyTicket}
              bgColor="amber"
              iconColor="amber"
            />
          </div>
        </div>
      )}
    </div>
  )
}
