'use server'

/**
 * Store Server Actions
 * - Buy Totem (100 pts) -> +1 tótem (máx 5)
 * - Buy Ad Package (puntos -> visitas) -> registra y notifica
 *
 * NOTE: Esta versión NO importa '@/lib/auth'. Pasa userId explícitamente.
 */

import { prisma } from '@/lib/prisma'
import { ECONOMY } from '@/lib/economyConfig'
import type { Prisma } from '@prisma/client'

/** Require userId explicitly to avoid build errors for missing auth module */
function requireUserId(userId?: string): string {
  if (userId) return userId
  throw new Error('Missing userId. Call this action as buyTotem(userId) / buyAdPackage(userId).')
}

export async function buyTotem(userId?: string) {
  const id = requireUserId(userId)
  const cost = ECONOMY.costs.totem
  const maxTotems = ECONOMY.maxTotems

  try {
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const user = await tx.user.findUnique({
        where: { id },
        select: { points: true, totems: true, isSuspended: true },
      })

      if (!user) throw new Error('Usuario no encontrado')
      if (user.isSuspended) throw new Error('Cuenta suspendida')

      // Límite de tótems
      if (user.totems >= maxTotems) {
        throw new Error(`Ya tienes el máximo de ${maxTotems} tótems`)
      }

      // Puntos suficientes
      if (user.points < cost) {
        throw new Error(`Necesitas ${cost} puntos. Tienes ${user.points}`)
      }

      const updatedUser = await tx.user.update({
        where: { id },
        data: {
          points: { decrement: cost },
          totems: { increment: 1 },
        },
        select: { points: true, totems: true },
      })

      // Notificación de compra exitosa
      await tx.notification.create({
        data: {
          userId: id,
          type: 'purchase_success',
          payload: {
            kind: 'totem',
            cost,
            totems: updatedUser.totems,
          },
        },
      })

      return {
        ok: true as const,
        points: updatedUser.points,
        totems: updatedUser.totems,
      }
    })

    return result
  } catch (error: any) {
    // Notificación de fallo (si se puede)
    try {
      await prisma.notification.create({
        data: {
          userId: id,
          type: 'purchase_failed',
          payload: {
            kind: 'totem',
            error: String(error?.message ?? error),
          },
        },
      })
    } catch {
      // ignorar errores de notificación
    }

    return {
      ok: false as const,
      error: error?.message ?? 'Error al procesar la compra',
    }
  }
}

export async function buyAdPackage(userId?: string, packageId?: string) {
  const id = requireUserId(userId)
  
  // Find the selected package
  const pkg = ECONOMY.adPackages.find(p => p.id === packageId)
  if (!pkg) {
    return { ok: false as const, error: 'Paquete no válido' }
  }
  
  const cost = pkg.costPoints
  const visits = pkg.visits

  try {
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const user = await tx.user.findUnique({
        where: { id },
        select: { points: true, isSuspended: true },
      })
      if (!user) throw new Error('User not found')
      if (user.isSuspended) throw new Error('Cuenta suspendida')

      if (user.points < cost) throw new Error('Puntos insuficientes')

      const updatedUser = await tx.user.update({
        where: { id },
        data: { points: { decrement: cost } },
        select: { points: true },
      })

      // Record a notification (hook into campaign system if you have one).
      await tx.notification.create({
        data: {
          userId: id,
          type: 'purchase_success',
          payload: { kind: 'ad_package', packageId, cost, visits },
        },
      })

      return { ok: true as const, visits, points: updatedUser.points }
    })
    return result
  } catch (error: any) {
    try {
      await prisma.notification.create({
        data: {
          userId: id,
          type: 'purchase_failed',
          payload: { kind: 'ad_package', packageId, error: String(error?.message ?? error) },
        },
      })
    } catch {}
    return { ok: false as const, error: error?.message ?? 'Error desconocido' }
  }
}
