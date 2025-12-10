'use server'

/**
 * Draw Server Actions
 * Maneja la compra de boletos para sorteos y loterías
 * - Sorteos: pago con puntos (Invitado+)
 * - Loterías Normales: pago con Metamask (Miembro/Basico+)
 * - Loterías VIP: pago con Metamask (VIP+)
 */

import { prisma } from '@/lib/prisma'
import {
  RAFFLE_CONFIG,
  LOTTERY_NORMAL_CONFIG,
  LOTTERY_VIP_CONFIG,
  canParticipateInDraw,
  getNextDrawDate,
  type UserRank,
} from '@/lib/economyConfig'
import type { Prisma } from '@prisma/client'

function requireUserId(userId?: string): string {
  if (userId) return userId
  throw new Error('Missing userId.')
}

/**
 * Obtiene o crea un sorteo activo para un tipo específico
 */
async function getOrCreateActiveDraw(
  type: string,
  prizeAmount: number,
  isMonthly: boolean = false
) {
  // Buscar sorteo activo existente
  let draw = await prisma.draw.findFirst({
    where: {
      type: type as any,
      status: 'active',
    },
  })

  // Si no existe, crear uno nuevo
  if (!draw) {
    const drawDate = getNextDrawDate(isMonthly)
    draw = await prisma.draw.create({
      data: {
        type: type as any,
        status: 'active',
        prizeAmount,
        drawDate,
      },
    })
  }

  return draw
}

/**
 * Genera un número de boleto único para un sorteo
 */
async function generateUniqueTicketNumber(drawId: string): Promise<string> {
  let attempts = 0
  const maxAttempts = 100

  while (attempts < maxAttempts) {
    // Generar número de 8 dígitos
    const ticketNumber = Math.floor(10000000 + Math.random() * 90000000).toString()
    
    // Verificar si ya existe
    const existing = await prisma.ticket.findUnique({
      where: {
        drawId_ticketNumber: {
          drawId,
          ticketNumber,
        },
      },
    })

    if (!existing) {
      return ticketNumber
    }

    attempts++
  }

  throw new Error('No se pudo generar un número de boleto único')
}

/**
 * Compra un boleto de SORTEO SEMANAL (pago con puntos)
 */
export async function buyRaffleWeeklyTicket(userId?: string) {
  const id = requireUserId(userId)
  const config = RAFFLE_CONFIG.weekly

  return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // Verificar usuario
    const user = await tx.user.findUnique({
      where: { id },
      select: { points: true, rank: true, isSuspended: true },
    })

    if (!user) return { ok: false, error: 'Usuario no encontrado' }
    if (user.isSuspended) return { ok: false, error: 'Cuenta suspendida' }
    if (!canParticipateInDraw(user.rank as UserRank, config.minRank)) {
      return { ok: false, error: `Debes ser al menos rango ${config.minRank}` }
    }
    if (user.points < config.ticketCostPoints) {
      return { ok: false, error: 'Puntos insuficientes' }
    }

    // Obtener o crear sorteo activo
    const draw = await getOrCreateActiveDraw(config.id, config.prizeAmount, false)

    // Generar número de boleto
    const ticketNumber = await generateUniqueTicketNumber(draw.id)

    // Descontar puntos
    await tx.user.update({
      where: { id },
      data: { points: { decrement: config.ticketCostPoints } },
    })

    // Crear boleto
    const ticket = await tx.ticket.create({
      data: {
        drawId: draw.id,
        userId: id,
        ticketNumber,
        paymentType: 'points',
        pointsCost: config.ticketCostPoints,
        status: 'paid',
      },
    })

    // Crear notificación
    await tx.notification.create({
      data: {
        userId: id,
        type: 'purchase_success',
        payload: {
          kind: 'raffle_ticket',
          drawType: config.id,
          ticketNumber,
          cost: config.ticketCostPoints,
        },
      },
    })

    return {
      ok: true,
      ticketNumber,
      drawDate: draw.drawDate,
      message: `Boleto comprado: ${ticketNumber}`,
    }
  })
}

/**
 * Compra un boleto de SORTEO MENSUAL (pago con puntos)
 */
export async function buyRaffleMonthlyTicket(userId?: string) {
  const id = requireUserId(userId)
  const config = RAFFLE_CONFIG.monthly

  return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const user = await tx.user.findUnique({
      where: { id },
      select: { points: true, rank: true, isSuspended: true },
    })

    if (!user) return { ok: false, error: 'Usuario no encontrado' }
    if (user.isSuspended) return { ok: false, error: 'Cuenta suspendida' }
    if (!canParticipateInDraw(user.rank as UserRank, config.minRank)) {
      return { ok: false, error: `Debes ser al menos rango ${config.minRank}` }
    }
    if (user.points < config.ticketCostPoints) {
      return { ok: false, error: 'Puntos insuficientes' }
    }

    const draw = await getOrCreateActiveDraw(config.id, config.prizeAmount, true)
    const ticketNumber = await generateUniqueTicketNumber(draw.id)

    await tx.user.update({
      where: { id },
      data: { points: { decrement: config.ticketCostPoints } },
    })

    const ticket = await tx.ticket.create({
      data: {
        drawId: draw.id,
        userId: id,
        ticketNumber,
        paymentType: 'points',
        pointsCost: config.ticketCostPoints,
        status: 'paid',
      },
    })

    await tx.notification.create({
      data: {
        userId: id,
        type: 'purchase_success',
        payload: {
          kind: 'raffle_ticket',
          drawType: config.id,
          ticketNumber,
          cost: config.ticketCostPoints,
        },
      },
    })

    return {
      ok: true,
      ticketNumber,
      drawDate: draw.drawDate,
      message: `Boleto comprado: ${ticketNumber}`,
    }
  })
}

/**
 * Compra un boleto de LOTERÍA NORMAL SEMANAL (pago con Metamask)
 * Nota: El pago debe ser verificado antes de llamar a esta función
 */
export async function buyLotteryWeeklyTicket(userId?: string, txHash?: string) {
  const id = requireUserId(userId)
  const config = LOTTERY_NORMAL_CONFIG.weekly

  if (!txHash) {
    return { ok: false, error: 'Hash de transacción requerido' }
  }

  return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const user = await tx.user.findUnique({
      where: { id },
      select: { rank: true, isSuspended: true },
    })

    if (!user) return { ok: false, error: 'Usuario no encontrado' }
    if (user.isSuspended) return { ok: false, error: 'Cuenta suspendida' }
    if (!canParticipateInDraw(user.rank as UserRank, config.minRank)) {
      return { ok: false, error: `Debes ser al menos rango Miembro` }
    }

    const draw = await getOrCreateActiveDraw(config.id, config.prizeAmount, false)
    const ticketNumber = await generateUniqueTicketNumber(draw.id)

    const ticket = await tx.ticket.create({
      data: {
        drawId: draw.id,
        userId: id,
        ticketNumber,
        paymentType: 'metamask',
        usdCost: config.ticketCostUSD,
        txHash,
        status: 'paid',
      },
    })

    await tx.notification.create({
      data: {
        userId: id,
        type: 'purchase_success',
        payload: {
          kind: 'lottery_ticket',
          drawType: config.id,
          ticketNumber,
          cost: config.ticketCostUSD,
          txHash,
        },
      },
    })

    return {
      ok: true,
      ticketNumber,
      drawDate: draw.drawDate,
      message: `Boleto de lotería comprado: ${ticketNumber}`,
    }
  })
}

/**
 * Compra un boleto de LOTERÍA NORMAL MENSUAL (pago con Metamask)
 */
export async function buyLotteryMonthlyTicket(userId?: string, txHash?: string) {
  const id = requireUserId(userId)
  const config = LOTTERY_NORMAL_CONFIG.monthly

  if (!txHash) {
    return { ok: false, error: 'Hash de transacción requerido' }
  }

  return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const user = await tx.user.findUnique({
      where: { id },
      select: { rank: true, isSuspended: true },
    })

    if (!user) return { ok: false, error: 'Usuario no encontrado' }
    if (user.isSuspended) return { ok: false, error: 'Cuenta suspendida' }
    if (!canParticipateInDraw(user.rank as UserRank, config.minRank)) {
      return { ok: false, error: `Debes ser al menos rango Miembro` }
    }

    const draw = await getOrCreateActiveDraw(config.id, config.prizeAmount, true)
    const ticketNumber = await generateUniqueTicketNumber(draw.id)

    const ticket = await tx.ticket.create({
      data: {
        drawId: draw.id,
        userId: id,
        ticketNumber,
        paymentType: 'metamask',
        usdCost: config.ticketCostUSD,
        txHash,
        status: 'paid',
      },
    })

    await tx.notification.create({
      data: {
        userId: id,
        type: 'purchase_success',
        payload: {
          kind: 'lottery_ticket',
          drawType: config.id,
          ticketNumber,
          cost: config.ticketCostUSD,
          txHash,
        },
      },
    })

    return {
      ok: true,
      ticketNumber,
      drawDate: draw.drawDate,
      message: `Boleto de lotería comprado: ${ticketNumber}`,
    }
  })
}

/**
 * Compra un boleto de LOTERÍA VIP SEMANAL (pago con Metamask)
 */
export async function buyLotteryVIPWeeklyTicket(userId?: string, txHash?: string) {
  const id = requireUserId(userId)
  const config = LOTTERY_VIP_CONFIG.weekly

  if (!txHash) {
    return { ok: false, error: 'Hash de transacción requerido' }
  }

  return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const user = await tx.user.findUnique({
      where: { id },
      select: { rank: true, isSuspended: true },
    })

    if (!user) return { ok: false, error: 'Usuario no encontrado' }
    if (user.isSuspended) return { ok: false, error: 'Cuenta suspendida' }
    if (!canParticipateInDraw(user.rank as UserRank, config.minRank)) {
      return { ok: false, error: `Debes ser al menos rango VIP` }
    }

    const draw = await getOrCreateActiveDraw(config.id, config.prizeAmount, false)
    const ticketNumber = await generateUniqueTicketNumber(draw.id)

    const ticket = await tx.ticket.create({
      data: {
        drawId: draw.id,
        userId: id,
        ticketNumber,
        paymentType: 'metamask',
        usdCost: config.ticketCostUSD,
        txHash,
        status: 'paid',
      },
    })

    await tx.notification.create({
      data: {
        userId: id,
        type: 'purchase_success',
        payload: {
          kind: 'lottery_vip_ticket',
          drawType: config.id,
          ticketNumber,
          cost: config.ticketCostUSD,
          txHash,
        },
      },
    })

    return {
      ok: true,
      ticketNumber,
      drawDate: draw.drawDate,
      message: `Boleto de lotería VIP comprado: ${ticketNumber}`,
    }
  })
}

/**
 * Compra un boleto de LOTERÍA VIP MENSUAL (pago con Metamask)
 */
export async function buyLotteryVIPMonthlyTicket(userId?: string, txHash?: string) {
  const id = requireUserId(userId)
  const config = LOTTERY_VIP_CONFIG.monthly

  if (!txHash) {
    return { ok: false, error: 'Hash de transacción requerido' }
  }

  return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const user = await tx.user.findUnique({
      where: { id },
      select: { rank: true, isSuspended: true },
    })

    if (!user) return { ok: false, error: 'Usuario no encontrado' }
    if (user.isSuspended) return { ok: false, error: 'Cuenta suspendida' }
    if (!canParticipateInDraw(user.rank as UserRank, config.minRank)) {
      return { ok: false, error: `Debes ser al menos rango VIP` }
    }

    const draw = await getOrCreateActiveDraw(config.id, config.prizeAmount, true)
    const ticketNumber = await generateUniqueTicketNumber(draw.id)

    const ticket = await tx.ticket.create({
      data: {
        drawId: draw.id,
        userId: id,
        ticketNumber,
        paymentType: 'metamask',
        usdCost: config.ticketCostUSD,
        txHash,
        status: 'paid',
      },
    })

    await tx.notification.create({
      data: {
        userId: id,
        type: 'purchase_success',
        payload: {
          kind: 'lottery_vip_ticket',
          drawType: config.id,
          ticketNumber,
          cost: config.ticketCostUSD,
          txHash,
        },
      },
    })

    return {
      ok: true,
      ticketNumber,
      drawDate: draw.drawDate,
      message: `Boleto de lotería VIP comprado: ${ticketNumber}`,
    }
  })
}

/**
 * Obtiene los boletos del usuario para un sorteo específico
 */
export async function getUserTickets(userId: string, drawType?: string) {
  const where: any = { userId }
  
  if (drawType) {
    where.draw = { type: drawType }
  }

  const tickets = await prisma.ticket.findMany({
    where,
    include: {
      draw: true,
    },
    orderBy: {
      purchasedAt: 'desc',
    },
  })

  return { ok: true, tickets }
}

/**
 * Obtiene el historial de sorteos completados
 */
export async function getDrawHistory(limit: number = 10) {
  const draws = await prisma.draw.findMany({
    where: {
      status: 'completed',
    },
    include: {
      result: true,
      tickets: {
        where: {
          status: 'winner',
        },
        take: 1,
      },
    },
    orderBy: {
      completedAt: 'desc',
    },
    take: limit,
  })

  return { ok: true, draws }
}

/**
 * Obtiene el sorteo activo actual para un tipo específico
 */
export async function getActiveDraw(drawType: string) {
  const draw = await prisma.draw.findFirst({
    where: {
      type: drawType as any,
      status: 'active',
    },
    include: {
      tickets: {
        select: {
          id: true,
        },
      },
    },
  })

  if (!draw) {
    return { ok: false, error: 'No hay sorteo activo' }
  }

  return {
    ok: true,
    draw: {
      ...draw,
      ticketCount: draw.tickets.length,
    },
  }
}
