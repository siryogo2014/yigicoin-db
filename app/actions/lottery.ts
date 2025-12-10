'use server'

/**
 * Lottery Server Actions
 * - Buy weekly lottery ticket (200 pts)
 * - Buy monthly lottery ticket (800 pts)
 */

import { prisma } from '@/lib/prisma'
import { ECONOMY } from '@/lib/economyConfig'
import type { Prisma } from '@prisma/client'

type LotteryType = 'weekly' | 'monthly'

function requireUserId(userId?: string): string {
  if (userId) return userId
  throw new Error('Missing userId. Call this action as buyLotteryTicket(userId, type).')
}

/**
 * Buy a lottery ticket (weekly or monthly)
 * Weekly: 200 pts, Monthly: 800 pts
 */
export async function buyLotteryTicket(userId?: string, type: LotteryType = 'weekly') {
  const id = requireUserId(userId)
  const cost = type === 'weekly' ? ECONOMY.costs.raffleWeekly : ECONOMY.costs.raffleMonthly

  return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const user = await tx.user.findUnique({
      where: { id },
      select: { points: true, rank: true, isSuspended: true },
    })

    if (!user) {
      return { ok: false, error: 'Usuario no encontrado' }
    }

    if (user.isSuspended) {
      return { ok: false, error: 'Cuenta suspendida' }
    }

    if (user.points < cost) {
      return { ok: false, error: 'Puntos insuficientes' }
    }

    // Deduct points
    const updated = await tx.user.update({
      where: { id },
      data: { points: { decrement: cost } },
      select: { points: true },
    })

    // Create notification
    await tx.notification.create({
      data: {
        userId: id,
        type: 'purchase_success',
        payload: {
          kind: 'lottery_ticket',
          lotteryType: type,
          cost,
        },
      },
    })

    return {
      ok: true,
      points: updated.points,
      message: `Boleto de lotería ${type === 'weekly' ? 'semanal' : 'mensual'} comprado exitosamente`,
    }
  })
}
