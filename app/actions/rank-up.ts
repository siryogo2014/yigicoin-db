'use server'
/**
 * Call this after updating a user's rank to ensure totem floor
 * Example: await upgradeUserRank(userId, 'vip')
 */

import { prisma } from '@/lib/prisma'
import type { Prisma, UserRank } from '@prisma/client'

// Base totems per rank (cumulative system)
const TOTEM_BONUS_BY_RANK: Record<UserRank, number> = {
  registrado: 0,
  invitado: 0,
  miembro: 0,
  vip: 1,
  premium: 2,
  elite: 2, // Changed from 4 to 2 as per requirements
}

/**
 * Upgrades user rank and adds cumulative totem bonus.
 * When a user upgrades to a new rank, they receive the totem bonus for that rank
 * added to their current totems (cumulative system).
 *
 * Example: VIP user (1 totem) upgrades to Premium (2 totems) -> gets 3 totems total
 */
export async function upgradeUserRank(userId: string, newRank: UserRank) {
  return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { rank: true, totems: true },
    })
    if (!user) throw new Error('User not found')

    // Get the totem bonus for the new rank
    const newRankBonus = TOTEM_BONUS_BY_RANK[newRank] ?? 0

    // Update rank and add totems (cumulative)
    await tx.user.update({
      where: { id: userId },
      data: {
        rank: newRank,
        totems: { increment: newRankBonus },
      },
    })

    // Create notification for rank upgrade
    if (newRankBonus > 0) {
      await tx.notification.create({
        data: {
          userId,
          type: 'purchase_success',
          payload: {
            kind: 'rank_upgrade',
            newRank,
            totemsAdded: newRankBonus,
            message: `¡Has subido a ${newRank}! Has recibido ${newRankBonus} tótem(s).`,
          },
        },
      })
    }

    return { ok: true, newRank, totemsAdded: newRankBonus }
  })
}
