'use client'
import { RefreshCcw } from 'lucide-react'
import React, { useState, useEffect } from 'react'
import { refreshCounter } from '@/app/actions/counter'
import { ECONOMY, counterSecondsForRank, type UserRank } from '@/lib/economyConfig'
import RefreshConfirmModal from './modals/RefreshConfirmModal'

type Props = {
  userId: string
  onRefreshed?: (newExpiresAt: string | Date) => void
  timeLeftSeconds?: number // Tiempo restante en segundos
}

export default function RefreshCounterButton({ userId, onRefreshed, timeLeftSeconds = 0 }: Props) {
  const [userPoints, setUserPoints] = useState(0)
  const [userRank, setUserRank] = useState<UserRank>('registrado')
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  
  useEffect(() => {
    try {
      const userData = JSON.parse(localStorage.getItem('user_simulation_data') || '{}')
      setUserPoints(userData?.points || 0)
      setUserRank(userData?.currentRank || 'registrado')
      const i = setInterval(() => {
        const u = JSON.parse(localStorage.getItem('user_simulation_data') || '{}')
        setUserPoints(u?.points || 0)
        setUserRank(u?.currentRank || 'registrado')
      }, 1000)
      return () => clearInterval(i)
    } catch {}
  }, [])

  const [loading, setLoading] = useState(false)
  
  // Get the ceiling for the current rank
  const ceilingSeconds = counterSecondsForRank(userRank)
  
  // NUEVO: Calcular si el botón debe estar habilitado
  // El botón está deshabilitado si:
  // 1. No tiene suficientes puntos (< 40)
  // 2. El tiempo restante ya está en o por encima del techo del rango
  const isAboveCeiling = timeLeftSeconds >= ceilingSeconds
  const hasEnoughPoints = userPoints >= ECONOMY.costs.refreshCounter

  const handleButtonClick = () => {
    // Show confirmation modal
    setShowConfirmModal(true)
  }

  const handleConfirmRefresh = async () => {
    setLoading(true)
    try {
      // Try server action first (for real DB)
      const res = await refreshCounter(userId)
      if (res.ok) {
        // Update localStorage for demo mode synchronization
        try {
          const userData = JSON.parse(localStorage.getItem('user_simulation_data') || '{}')
          userData.points = res.points
          userData.counterExpiresAt = res.counterExpiresAt ? new Date(res.counterExpiresAt).toISOString() : null
          userData.lastRefresh = new Date().toISOString()
          localStorage.setItem('user_simulation_data', JSON.stringify(userData))
        } catch (e) {
          console.error('Error updating localStorage:', e)
        }

        setShowConfirmModal(false)
        // @ts-ignore
        window?.YigiToast?.success?.('Temporizador refrescado (-40 puntos)')
        onRefreshed?.(res.counterExpiresAt as any)
      } else {
        // @ts-ignore
        window?.YigiToast?.error?.(res.error ?? 'No se pudo refrescar el temporizador')
      }
    } catch (error: any) {
      // If server action fails, try localStorage-only mode (demo mode)
      console.warn('Server action failed, trying demo mode:', error)
      try {
        const userData = JSON.parse(localStorage.getItem('user_simulation_data') || '{}')
        const currentPoints = userData.points || 0
        const cost = ECONOMY.costs.refreshCounter // 40
        const timeToAdd = ECONOMY.refreshButton.timeAddedSeconds // 48

        if (currentPoints < cost) {
          // @ts-ignore
          window?.YigiToast?.error?.('Puntos insuficientes (necesitas 40)')
          setLoading(false)
          return
        }

        // Get current remaining time
        const counterExpiresAt = userData.counterExpiresAt ? new Date(userData.counterExpiresAt) : new Date()
        const now = Date.now()
        const currentRemainingMs = Math.max(0, counterExpiresAt.getTime() - now)
        const currentRemainingSeconds = Math.floor(currentRemainingMs / 1000)

        // Calculate new time: current + 48 seconds, but don't exceed ceiling
        const newTimeSeconds = Math.min(currentRemainingSeconds + timeToAdd, ceilingSeconds)
        const newExpiresAt = new Date(now + newTimeSeconds * 1000)

        // Deduct points and update counter in localStorage
        userData.points = currentPoints - cost
        userData.counterExpiresAt = newExpiresAt.toISOString()
        userData.lastRefresh = new Date().toISOString()
        localStorage.setItem('user_simulation_data', JSON.stringify(userData))

        setShowConfirmModal(false)
        // @ts-ignore
        window?.YigiToast?.success?.(`Temporizador refrescado (-${cost} puntos) [Modo Demo]`)
        onRefreshed?.(newExpiresAt)
      } catch (localError) {
        console.error('Demo mode also failed:', localError)
        // @ts-ignore
        window?.YigiToast?.error?.('Error al refrescar temporizador')
      }
    } finally {
      setLoading(false)
    }
  }

  // El botón está habilitado solo si:
  // 1. El usuario tiene >= 40 puntos
  // 2. El tiempo restante NO está en o por encima del techo del rango
  // 3. No está en proceso de carga
  const isButtonEnabled = hasEnoughPoints && !isAboveCeiling && !loading
  
  // Mensaje del tooltip dinámico
  const getTooltipMessage = () => {
    if (loading) return 'Procesando...'
    if (!hasEnoughPoints) return 'Necesitas 40 puntos para refrescar'
    if (isAboveCeiling) return 'Ya estás en el tiempo máximo de tu rango'
    return 'Refrescar temporizador (40 puntos)'
  }

  return (
    <>
      <button
        type="button"
        onClick={handleButtonClick}
        className={`inline-flex items-center justify-center rounded-full w-10 h-10 shadow transition ${isButtonEnabled ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-200' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
        disabled={!isButtonEnabled}
        title={getTooltipMessage()}
      >
        <RefreshCcw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} aria-hidden />
      </button>

      <RefreshConfirmModal
        show={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmRefresh}
        currentPoints={userPoints}
        cost={ECONOMY.costs.refreshCounter}
        ceilingSeconds={ceilingSeconds}
        currentTimeSeconds={timeLeftSeconds}
        timeToAddSeconds={ECONOMY.refreshButton.timeAddedSeconds}
        isLoading={loading}
      />
    </>
  )
}