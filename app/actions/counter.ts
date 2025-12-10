'use server'

/**
 * Counter Server Actions
 * - Auto-use totem on expiry
 * - Suspend if no totems
 * - Manual refresh with points (40 pts) => reset to full for current rank
 * 
 * NOTE: This version does NOT import '@/lib/auth'. Pass userId explicitly.
 */

import { prisma } from '@/lib/prisma'
import { ECONOMY, counterMsForRank, counterSecondsForRank } from '@/lib/economyConfig'
import type { Prisma } from '@prisma/client';
type HeartbeatStatus = 'ok' | 'totem_used' | 'suspended'

/** Require userId explicitly to avoid build errors for missing auth module */
function requireUserId(userId?: string): string {
  if (userId) return userId
  throw new Error('Missing userId. Call this action as heartbeatCounter(userId) / refreshCounter(userId).')
}

// Piso de tótems por rango (según tu regla): VIP 1, Premium 2, Elite 4; demás 0
const TOTEM_FLOOR: Record<UserRank, number> = {
  registrado: 0,
  invitado: 0,
  miembro: 0,
  vip: 1,
  premium: 2,
  elite: 4,
}

/**
 * Ensures the user's totems are at least the base floor for their rank.
 * (Does not give extra beyond the floor.)
 */
async function ensureTotemFloor(tx: Prisma.TransactionClient, userId: string, rank: UserRank) {
  const base = TOTEM_FLOOR[rank] ?? 0
  await tx.$executeRawUnsafe(
    `UPDATE "User" SET "totems" = GREATEST("totems", $1) WHERE "id" = $2`,
    base,
    userId
  )
}

export async function heartbeatCounter(userId?: string) {
  const id = requireUserId(userId)

  const u = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      rank: true,
      totems: true,
      counterExpiresAt: true,
      isSuspended: true,
    },
  })
  if (!u) throw new Error('User not found')

  if (u.isSuspended) {
    return { status: 'suspended' as HeartbeatStatus, remainingMs: 0 }
  }

  const now = Date.now()
  const remainingMs = Math.max(0, (u.counterExpiresAt?.getTime() ?? 0) - now)
  if (remainingMs > 0) {
    return { status: 'ok' as HeartbeatStatus, remainingMs }
  }

  // Counter expired: try to auto-use a totem atomically
  const res = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // Keep at least the base floor of totems by rank
    await ensureTotemFloor(tx, id, u.rank as UserRank)

    const resetMs = counterMsForRank(u.rank as any)

    const updated = await tx.user.updateMany({
      where: {
        id,
        totems: { gt: 0 },
        OR: [{ counterExpiresAt: null }, { counterExpiresAt: { lte: new Date() } }],
        isSuspended: false,
      },
      data: {
        totems: { decrement: 1 },
        counterExpiresAt: new Date(Date.now() + resetMs),
        lastTotemUsedAt: new Date(),
      },
    })

    if (updated.count === 1) {
      // Success: create notification and return info
      await tx.notification.create({
        data: {
          userId: id,
          type: 'totem_used',
          payload: {
            message: 'Tótem usado automáticamente. Contador restablecido.',
            resetMs,
          },
        },
      })

      const refreshed = await tx.user.findUnique({
        where: { id },
        select: { counterExpiresAt: true, totems: true },
      })

      return {
        kind: 'used' as const,
        counterExpiresAt: refreshed!.counterExpiresAt!,
        totems: refreshed!.totems,
        resetMs,
      }
    }

    // No totems ⇒ suspend
    await tx.user.update({
      where: { id },
      data: { isSuspended: true, suspendedAt: new Date() },
    })
    await tx.notification.create({
      data: {
        userId: id,
        type: 'suspended_for_counter',
        payload: { reason: 'counter_expired' },
      },
    })

    return { kind: 'suspended' as const }
  })

  if (res.kind === 'used') {
    return {
      status: 'totem_used' as HeartbeatStatus,
      remainingMs: res.counterExpiresAt.getTime() - Date.now(),
      totems: res.totems,
      counterExpiresAt: res.counterExpiresAt,
    }
  }
  return { status: 'suspended' as HeartbeatStatus, remainingMs: 0 }
}

/**
 * Adds time to the counter (up to rank ceiling) by paying 40 points.
 * NEW BEHAVIOR: Adds +48 seconds without exceeding the rank's ceiling
 * If not enough points or suspended => error.
 */
export async function refreshCounter(userId?: string) {
  const id = requireUserId(userId)
  const cost = ECONOMY.costs.refreshCounter // 40
  const timeToAddSeconds = ECONOMY.refreshButton.timeAddedSeconds // 48

  return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const user = await tx.user.findUnique({
      where: { id },
      select: { points: true, rank: true, isSuspended: true, counterExpiresAt: true },
    })
    if (!user || user.isSuspended) throw new Error('No disponible')

    if (user.points < cost) throw new Error('Puntos insuficientes')

    // Get current remaining time in seconds
    const now = Date.now()
    const currentRemainingMs = Math.max(0, (user.counterExpiresAt?.getTime() ?? 0) - now)
    const currentRemainingSeconds = Math.floor(currentRemainingMs / 1000)

    // Get the ceiling for this rank
    const ceilingSeconds = counterMsForRank(user.rank as any) / 1000

    // Check if already at or above ceiling
    if (currentRemainingSeconds >= ceilingSeconds) {
      throw new Error('Ya estás en el tiempo máximo de tu rango')
    }

    // Calculate new time: current + 48 seconds, but don't exceed ceiling
    const newTimeSeconds = Math.min(currentRemainingSeconds + timeToAddSeconds, ceilingSeconds)
    const newExpiresAt = new Date(now + newTimeSeconds * 1000)

    const updated = await tx.user.update({
      where: { id },
      data: {
        points: { decrement: cost },
        counterExpiresAt: newExpiresAt,
      },
      select: { points: true, counterExpiresAt: true },
    })

    await tx.notification.create({
      data: {
        userId: id,
        type: 'purchase_success',
        payload: { 
          kind: 'counter_refresh', 
          cost, 
          timeToAddSeconds,
          newTimeSeconds 
        },
      },
    })

    return { ok: true, points: updated.points, counterExpiresAt: updated.counterExpiresAt }
  })
}
