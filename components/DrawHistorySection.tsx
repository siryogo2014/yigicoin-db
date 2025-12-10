'use client'

/**
 * Componente para ver el historial de boletos comprados y resultados de sorteos
 */

import React, { useState, useEffect } from 'react'
import { getUserTickets, getDrawHistory } from '@/app/actions/draws'

type Props = {
  userId: string
  selectedTheme?: string
}

export default function DrawHistorySection({ userId, selectedTheme = 'claro' }: Props) {
  const [activeTab, setActiveTab] = useState<'tickets' | 'results'>('tickets')
  const [userTickets, setUserTickets] = useState<any[]>([])
  const [drawResults, setDrawResults] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [userId])

  const loadData = async () => {
    setLoading(true)
    try {
      const [ticketsRes, resultsRes] = await Promise.all([
        getUserTickets(userId),
        getDrawHistory(10),
      ])
      
      if (ticketsRes.ok) {
        setUserTickets(ticketsRes.tickets || [])
      }
      
      if (resultsRes.ok) {
        setDrawResults(resultsRes.draws || [])
      }
    } catch (error) {
      console.error('Error loading history:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (date: Date | string) => {
    const d = new Date(date)
    return d.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getDrawTypeName = (type: string) => {
    const names: Record<string, string> = {
      raffle_weekly: 'Sorteo Semanal',
      raffle_monthly: 'Sorteo Mensual',
      lottery_weekly: 'Lotería Semanal',
      lottery_monthly: 'Lotería Mensual',
      lottery_vip_weekly: 'Lotería VIP Semanal',
      lottery_vip_monthly: 'Lotería VIP Mensual',
    }
    return names[type] || type
  }

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      paid: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      winner: 'bg-purple-100 text-purple-800',
      loser: 'bg-gray-100 text-gray-800',
    }
    const labels: Record<string, string> = {
      paid: 'Pagado',
      pending: 'Pendiente',
      winner: '🏆 Ganador',
      loser: 'No ganó',
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || colors.pending}`}>
        {labels[status] || status}
      </span>
    )
  }

  const renderTickets = () => {
    if (loading) {
      return (
        <div className="text-center py-8">
          <i className="ri-loader-4-line animate-spin text-3xl text-blue-600"></i>
          <p className={`mt-2 ${selectedTheme === 'oscuro' ? 'text-gray-400' : 'text-gray-600'}`}>
            Cargando boletos...
          </p>
        </div>
      )
    }

    if (userTickets.length === 0) {
      return (
        <div className="text-center py-8">
          <i className="ri-ticket-line text-4xl text-gray-400 mb-3"></i>
          <p className={`${selectedTheme === 'oscuro' ? 'text-gray-400' : 'text-gray-600'}`}>
            No tienes boletos comprados
          </p>
          <p className={`text-sm ${selectedTheme === 'oscuro' ? 'text-gray-500' : 'text-gray-500'} mt-1`}>
            Compra boletos en las secciones de Sorteos o Loterías
          </p>
        </div>
      )
    }

    return (
      <div className="space-y-3">
        {userTickets.map((ticket) => (
          <div
            key={ticket.id}
            className={`${
              selectedTheme === 'oscuro'
                ? 'bg-gray-700 border-gray-600'
                : 'bg-white border-gray-200'
            } border rounded-lg p-4`}
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <h4
                  className={`font-semibold ${selectedTheme === 'oscuro' ? 'text-white' : 'text-gray-800'}`}
                >
                  {getDrawTypeName(ticket.draw.type)}
                </h4>
                <p
                  className={`text-sm ${selectedTheme === 'oscuro' ? 'text-gray-400' : 'text-gray-600'}`}
                >
                  Boleto #{ticket.ticketNumber}
                </p>
              </div>
              {getStatusBadge(ticket.status)}
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p
                  className={`${selectedTheme === 'oscuro' ? 'text-gray-400' : 'text-gray-600'}`}
                >
                  Comprado:
                </p>
                <p
                  className={`font-medium ${selectedTheme === 'oscuro' ? 'text-gray-300' : 'text-gray-800'}`}
                >
                  {formatDate(ticket.purchasedAt)}
                </p>
              </div>
              <div>
                <p
                  className={`${selectedTheme === 'oscuro' ? 'text-gray-400' : 'text-gray-600'}`}
                >
                  Costo:
                </p>
                <p
                  className={`font-medium ${selectedTheme === 'oscuro' ? 'text-gray-300' : 'text-gray-800'}`}
                >
                  {ticket.paymentType === 'points'
                    ? `${ticket.pointsCost} puntos`
                    : `$${ticket.usdCost} USD`}
                </p>
              </div>
            </div>

            {ticket.draw.status === 'active' && (
              <div
                className={`mt-3 ${selectedTheme === 'oscuro' ? 'bg-blue-900 border-blue-700' : 'bg-blue-50 border-blue-200'} border rounded p-2`}
              >
                <p className={`text-xs ${selectedTheme === 'oscuro' ? 'text-blue-300' : 'text-blue-700'}`}>
                  ⏳ Sorteo pendiente: {formatDate(ticket.draw.drawDate)}
                </p>
              </div>
            )}

            {ticket.status === 'winner' && (
              <div
                className={`mt-3 ${selectedTheme === 'oscuro' ? 'bg-purple-900 border-purple-700' : 'bg-purple-50 border-purple-200'} border rounded p-2`}
              >
                <p className={`text-sm font-semibold ${selectedTheme === 'oscuro' ? 'text-purple-300' : 'text-purple-700'}`}>
                  🎉 ¡Felicidades! Ganaste ${ticket.draw.prizeAmount} USD
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    )
  }

  const renderResults = () => {
    if (loading) {
      return (
        <div className="text-center py-8">
          <i className="ri-loader-4-line animate-spin text-3xl text-blue-600"></i>
          <p className={`mt-2 ${selectedTheme === 'oscuro' ? 'text-gray-400' : 'text-gray-600'}`}>
            Cargando resultados...
          </p>
        </div>
      )
    }

    if (drawResults.length === 0) {
      return (
        <div className="text-center py-8">
          <i className="ri-trophy-line text-4xl text-gray-400 mb-3"></i>
          <p className={`${selectedTheme === 'oscuro' ? 'text-gray-400' : 'text-gray-600'}`}>
            No hay resultados de sorteos aún
          </p>
          <p className={`text-sm ${selectedTheme === 'oscuro' ? 'text-gray-500' : 'text-gray-500'} mt-1`}>
            Los resultados aparecerán después de cada sorteo
          </p>
        </div>
      )
    }

    return (
      <div className="space-y-3">
        {drawResults.map((draw) => (
          <div
            key={draw.id}
            className={`${
              selectedTheme === 'oscuro'
                ? 'bg-gray-700 border-gray-600'
                : 'bg-white border-gray-200'
            } border rounded-lg p-4`}
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <h4
                  className={`font-semibold ${selectedTheme === 'oscuro' ? 'text-white' : 'text-gray-800'}`}
                >
                  {getDrawTypeName(draw.type)}
                </h4>
                <p
                  className={`text-sm ${selectedTheme === 'oscuro' ? 'text-gray-400' : 'text-gray-600'}`}
                >
                  {formatDate(draw.completedAt)}
                </p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Completado
              </span>
            </div>

            {draw.result && (
              <div className="space-y-2">
                <div
                  className={`${selectedTheme === 'oscuro' ? 'bg-gray-600' : 'bg-gray-50'} rounded-lg p-3`}
                >
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p
                        className={`${selectedTheme === 'oscuro' ? 'text-gray-400' : 'text-gray-600'}`}
                      >
                        Premio:
                      </p>
                      <p
                        className={`font-bold text-green-600`}
                      >
                        ${draw.result.prizeAwarded} USD
                      </p>
                    </div>
                    <div>
                      <p
                        className={`${selectedTheme === 'oscuro' ? 'text-gray-400' : 'text-gray-600'}`}
                      >
                        Participantes:
                      </p>
                      <p
                        className={`font-medium ${selectedTheme === 'oscuro' ? 'text-gray-300' : 'text-gray-800'}`}
                      >
                        {draw.result.totalTickets}
                      </p>
                    </div>
                  </div>
                </div>

                {draw.winnerId ? (
                  <div
                    className={`${selectedTheme === 'oscuro' ? 'bg-purple-900 border-purple-700' : 'bg-purple-50 border-purple-200'} border rounded p-3`}
                  >
                    <p
                      className={`text-sm ${selectedTheme === 'oscuro' ? 'text-purple-300' : 'text-purple-700'}`}
                    >
                      🏆 Boleto ganador:{' '}
                      <span className="font-bold">
                        {draw.tickets[0]?.ticketNumber || 'N/A'}
                      </span>
                    </p>
                  </div>
                ) : (
                  <div
                    className={`${selectedTheme === 'oscuro' ? 'bg-yellow-900 border-yellow-700' : 'bg-yellow-50 border-yellow-200'} border rounded p-3`}
                  >
                    <p
                      className={`text-sm ${selectedTheme === 'oscuro' ? 'text-yellow-300' : 'text-yellow-700'}`}
                    >
                      ⚠️ No hubo ganador. Premio acumulado para el próximo sorteo.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h3
        className={`text-lg sm:text-xl font-bold ${selectedTheme === 'oscuro' ? 'text-white' : 'text-gray-800'}`}
      >
        Historial
      </h3>

      {/* Tabs */}
      <div
        className={`${selectedTheme === 'oscuro' ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'} rounded-xl border p-2`}
      >
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveTab('tickets')}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'tickets'
                ? 'bg-blue-600 text-white'
                : selectedTheme === 'oscuro'
                  ? 'text-gray-300 hover:bg-gray-700'
                  : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <i className="ri-ticket-line mr-2"></i>
            Mis Boletos
          </button>
          <button
            onClick={() => setActiveTab('results')}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'results'
                ? 'bg-blue-600 text-white'
                : selectedTheme === 'oscuro'
                  ? 'text-gray-300 hover:bg-gray-700'
                  : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <i className="ri-trophy-line mr-2"></i>
            Resultados
          </button>
        </div>
      </div>

      {/* Content */}
      <div
        className={`${selectedTheme === 'oscuro' ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'} rounded-xl border p-4`}
      >
        {activeTab === 'tickets' ? renderTickets() : renderResults()}
      </div>
    </div>
  )
}
