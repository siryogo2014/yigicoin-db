'use client'
import React, { useState, useEffect } from 'react'
import { buyTotem, buyAdPackage } from '@/app/actions/store'
import { ECONOMY } from '@/lib/economyConfig'

type Props = {
  userId: string
  userRank: 'registrado' | 'invitado' | 'miembro' | 'vip' | 'premium' | 'elite'
  points: number
}

const rankOrder = ['registrado', 'invitado', 'miembro', 'vip', 'premium', 'elite'] as const
const rankGte = (a: Props['userRank'], b: Props['userRank']) =>
  rankOrder.indexOf(a) >= rankOrder.indexOf(b)

export default function StoreSection({ userId, userRank, points }: Props) {
  const [busy, setBusy] = useState<string | null>(null)
  const [userTotems, setUserTotems] = useState(0)
  const canSee = rankGte(userRank, 'invitado')
  const maxTotems = ECONOMY.maxTotems

  // Cargar tótems del usuario desde localStorage
  useEffect(() => {
    const loadTotems = () => {
      try {
        const userData = JSON.parse(localStorage.getItem('user_simulation_data') || '{}')
        setUserTotems(userData.totems || 0)
      } catch { }
    }
    loadTotems()
    const interval = setInterval(loadTotems, 2000)
    return () => clearInterval(interval)
  }, [])

  if (!canSee) {
    return (
      <div className="rounded-xl border p-4">
        <h3 className="font-semibold">Tienda</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Disponible desde el rango <b>Invitado</b>.
        </p>
      </div>
    )
  }

  const onBuyTotem = async () => {
    try {
      setBusy('totem')
      const res = await buyTotem(userId)
      if (res.ok) {
        // @ts-ignore
        window?.YigiToast?.success?.(
          `Tótem comprado! Ahora tienes ${res.totems} tótem(s) (-${ECONOMY.costs.totem} pts)`
        )
        // Actualizar estado local
        if (typeof res.totems === 'number') {
          setUserTotems(res.totems)
        }
        // Refrescar datos del usuario en localStorage
        try {
          const userData = JSON.parse(localStorage.getItem('user_simulation_data') || '{}')
          if (typeof res.totems === 'number') userData.totems = res.totems
          if (typeof res.points === 'number') userData.points = res.points
          localStorage.setItem('user_simulation_data', JSON.stringify(userData))
        } catch { }
      } else {
        // @ts-ignore
        window?.YigiToast?.error?.(res.error ?? 'No se pudo comprar tótem')
      }
    } finally {
      setBusy(null)
    }
  }

  const onBuyPackage = async (packageId: string) => {
    try {
      setBusy(packageId)
      const pkg = ECONOMY.adPackages.find(p => p.id === packageId)
      if (!pkg) {
        // @ts-ignore
        window?.YigiToast?.error?.('Paquete no encontrado')
        return
      }

      const res = await buyAdPackage(userId, packageId)
      if (res.ok) {
        // @ts-ignore
        window?.YigiToast?.success?.(
          `Paquete de ${pkg.visits} visitas comprado (-${pkg.costPoints} pts)`
        )

        // 🔥 Actualizar simulación local: agregar paquete a user_simulation_data.adPackages
        try {
          const raw = localStorage.getItem('user_simulation_data') || '{}'
          const userData = JSON.parse(raw)

          const currentPackages = Array.isArray(userData.adPackages)
            ? userData.adPackages
            : []

          const newPackage = {
            id: pkg.id,
            visits: pkg.visits,
            // visitsRemaining es lo que usa useSimulation para D
            visitsRemaining: pkg.visits,
            purchasedAt: new Date().toISOString(),
            consumedBy: [] as string[],
          }

          userData.adPackages = [...currentPackages, newPackage]

          // Si el backend devuelve puntos actualizados, respétalos
          if (typeof res.points === 'number') {
            userData.points = res.points
          }

          localStorage.setItem('user_simulation_data', JSON.stringify(userData))
        } catch (e) {
          console.error('[Store] Error actualizando adPackages en localStorage', e)
        }
      } else {
        // @ts-ignore
        window?.YigiToast?.error?.(res.error ?? 'No se pudo comprar el paquete')
      }
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className="rounded-2xl border p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Tienda</h3>
        <span className="text-sm text-muted-foreground">
          Tus puntos: {points.toLocaleString()}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mt-3">
        {/* Tótem */}
        <div className="rounded-xl border p-4">
          <h4 className="font-medium">Tótem digital 🗿</h4>
          <p className="text-sm text-muted-foreground">
            Vida extra para evitar suspensión cuando expire tu contador.
          </p>
          <p className="mt-2 text-sm">
            Precio: <b>{ECONOMY.costs.totem} pts</b>
          </p>
          <div className="mt-2 text-xs text-muted-foreground">
            <p>
              Tótems actuales:{' '}
              <b
                className={
                  userTotems === 0
                    ? 'text-red-600'
                    : userTotems >= maxTotems
                      ? 'text-amber-600'
                      : 'text-green-600'
                }
              >
                {userTotems}/{maxTotems}
              </b>
            </p>
            {userTotems >= maxTotems && (
              <p className="text-amber-600 mt-1">⚠️ Ya tienes el máximo de tótems</p>
            )}
          </div>
          <button
            onClick={onBuyTotem}
            disabled={busy === 'totem' || userTotems >= maxTotems}
            className="mt-3 rounded-lg bg-purple-600 px-3 py-1.5 text-white text-sm hover:bg-purple-700 disabled:opacity-60 disabled:cursor-not-allowed w-full"
          >
            {busy === 'totem'
              ? 'Comprando…'
              : userTotems >= maxTotems
                ? 'Límite alcanzado'
                : 'Comprar tótem'}
          </button>
        </div>

        {/* Paquetes de visitas */}
        {ECONOMY.adPackages.map((pkg) => (
          <div key={pkg.id} className="rounded-xl border p-4">
            <h4 className="font-medium">📢 {pkg.visits} visitas</h4>
            <p className="text-sm text-muted-foreground">
              Agrega {pkg.visits.toLocaleString()} visitas a tu campaña.
            </p>
            <p className="mt-2 text-sm">
              Precio: <b>{pkg.costPoints} pts</b>
            </p>
            <button
              onClick={() => onBuyPackage(pkg.id)}
              disabled={busy === pkg.id || points < pkg.costPoints}
              className="mt-3 rounded-lg bg-indigo-600 px-3 py-1.5 text-white text-sm hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed w-full"
            >
              {busy === pkg.id
                ? 'Comprando…'
                : points < pkg.costPoints
                  ? 'Puntos insuficientes'
                  : 'Comprar paquete'}
            </button>
          </div>
        ))}
      </div>
    </section>
  )
}
