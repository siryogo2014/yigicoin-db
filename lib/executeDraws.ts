/**
 * Script para ejecutar sorteos programados
 * Este script debe ejecutarse periódicamente (ej. cada hora o mediante cron)
 * para procesar sorteos cuya fecha de ejecución ya pasó
 */

import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

/**
 * Ejecuta todos los sorteos pendientes cuya fecha ya pasó
 */
export async function executeScheduledDraws() {
  console.log('[executeDraws] Buscando sorteos pendientes...')
  
  const now = new Date()
  
  // Buscar sorteos activos cuya fecha de sorteo ya pasó
  const pendingDraws = await prisma.draw.findMany({
    where: {
      status: 'active',
      drawDate: {
        lte: now,
      },
    },
    include: {
      tickets: {
        where: {
          status: 'paid',
        },
      },
    },
  })

  console.log(`[executeDraws] Encontrados ${pendingDraws.length} sorteos pendientes`)

  const results = []

  for (const draw of pendingDraws) {
    console.log(`[executeDraws] Procesando sorteo ${draw.id} (${draw.type})`)
    
    try {
      const result = await executeDraw(draw.id)
      results.push(result)
      console.log(`[executeDraws] ✓ Sorteo ${draw.id} completado exitosamente`)
    } catch (error) {
      console.error(`[executeDraws] ✗ Error al ejecutar sorteo ${draw.id}:`, error)
      results.push({
        drawId: draw.id,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  return {
    totalProcessed: pendingDraws.length,
    results,
  }
}

/**
 * Ejecuta un sorteo específico
 */
export async function executeDraw(drawId: string) {
  return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // Obtener sorteo con sus boletos
    const draw = await tx.draw.findUnique({
      where: { id: drawId },
      include: {
        tickets: {
          where: {
            status: 'paid',
          },
        },
      },
    })

    if (!draw) {
      throw new Error(`Sorteo ${drawId} no encontrado`)
    }

    if (draw.status !== 'active') {
      throw new Error(`Sorteo ${drawId} no está activo (status: ${draw.status})`)
    }

    const paidTickets = draw.tickets
    const totalTickets = paidTickets.length

    console.log(`[executeDraw] Sorteo ${drawId}: ${totalTickets} boletos pagados`)

    let winnerId: string | null = null
    let winnerTicketId: string | null = null
    let prizeAwarded = draw.prizeAmount + draw.accumulatedPrize

    // Seleccionar ganador si hay boletos
    if (totalTickets > 0) {
      const winnerIndex = Math.floor(Math.random() * totalTickets)
      const winnerTicket = paidTickets[winnerIndex]
      
      winnerId = winnerTicket.userId
      winnerTicketId = winnerTicket.id

      console.log(`[executeDraw] Ganador seleccionado: ticket ${winnerTicket.ticketNumber}`)

      // Actualizar el boleto ganador
      await tx.ticket.update({
        where: { id: winnerTicket.id },
        data: { status: 'winner' },
      })

      // Marcar los demás boletos como perdedores
      await tx.ticket.updateMany({
        where: {
          drawId: draw.id,
          id: { not: winnerTicket.id },
          status: 'paid',
        },
        data: { status: 'loser' },
      })

      // Crear notificación para el ganador
      await tx.notification.create({
        data: {
          userId: winnerId,
          type: 'purchase_success', // Podríamos agregar un tipo específico para ganadores
          payload: {
            kind: 'draw_winner',
            drawType: draw.type,
            ticketNumber: winnerTicket.ticketNumber,
            prize: prizeAwarded,
          },
        },
      })
    } else {
      console.log(`[executeDraw] No hay boletos, premio acumulado: ${prizeAwarded}`)
    }

    // Actualizar el sorteo
    await tx.draw.update({
      where: { id: draw.id },
      data: {
        status: 'completed',
        completedAt: new Date(),
        winnerId,
        winnerTicketId,
      },
    })

    // Crear el resultado del sorteo
    const drawResult = await tx.drawResult.create({
      data: {
        drawId: draw.id,
        winnerId,
        winnerTicketId,
        prizeAwarded,
        totalTickets,
      },
    })

    // Si no hubo ganador, crear el próximo sorteo con premio acumulado
    if (totalTickets === 0) {
      const isMonthly = draw.type.includes('monthly')
      const nextDrawDate = calculateNextDrawDate(isMonthly)
      
      await tx.draw.create({
        data: {
          type: draw.type,
          status: 'active',
          prizeAmount: draw.prizeAmount,
          accumulatedPrize: prizeAwarded,
          drawDate: nextDrawDate,
        },
      })
      
      console.log(`[executeDraw] Creado próximo sorteo con premio acumulado: ${prizeAwarded}`)
    } else {
      // Crear el próximo sorteo normal
      const isMonthly = draw.type.includes('monthly')
      const nextDrawDate = calculateNextDrawDate(isMonthly)
      
      await tx.draw.create({
        data: {
          type: draw.type,
          status: 'active',
          prizeAmount: draw.prizeAmount,
          accumulatedPrize: 0,
          drawDate: nextDrawDate,
        },
      })
      
      console.log(`[executeDraw] Creado próximo sorteo sin acumulación`)
    }

    return {
      drawId: draw.id,
      success: true,
      winnerId,
      winnerTicketId,
      prizeAwarded,
      totalTickets,
    }
  })
}

/**
 * Calcula la próxima fecha de sorteo (viernes 00:00)
 */
function calculateNextDrawDate(isMonthly: boolean): Date {
  const now = new Date()
  const nextDraw = new Date(now)
  
  // Encontrar el próximo viernes
  const daysUntilFriday = (5 - now.getDay() + 7) % 7
  nextDraw.setDate(now.getDate() + (daysUntilFriday === 0 ? 7 : daysUntilFriday))
  nextDraw.setHours(0, 0, 0, 0)
  
  if (isMonthly) {
    // Buscar el último viernes del mes
    const year = nextDraw.getFullYear()
    const month = nextDraw.getMonth()
    const lastDayOfMonth = new Date(year, month + 1, 0)
    const lastFriday = new Date(lastDayOfMonth)
    
    // Retroceder hasta encontrar el viernes
    while (lastFriday.getDay() !== 5) {
      lastFriday.setDate(lastFriday.getDate() - 1)
    }
    lastFriday.setHours(0, 0, 0, 0)
    
    // Si el último viernes ya pasó, buscar el del próximo mes
    if (lastFriday < now) {
      const nextMonth = new Date(year, month + 2, 0)
      const nextLastFriday = new Date(nextMonth)
      while (nextLastFriday.getDay() !== 5) {
        nextLastFriday.setDate(nextLastFriday.getDate() - 1)
      }
      nextLastFriday.setHours(0, 0, 0, 0)
      return nextLastFriday
    }
    
    return lastFriday
  }
  
  return nextDraw
}

/**
 * Script ejecutable para pruebas manuales o cron jobs
 */
export async function main() {
  console.log('=== Iniciando ejecución de sorteos programados ===')
  console.log('Fecha actual:', new Date().toISOString())
  
  try {
    const result = await executeScheduledDraws()
    console.log('\n=== Resultado de la ejecución ===')
    console.log(`Total de sorteos procesados: ${result.totalProcessed}`)
    console.log('\nDetalles:')
    result.results.forEach((r, index) => {
      console.log(`\n${index + 1}. Sorteo ${r.drawId}:`)
      if (r.success && 'winnerId' in r && 'prizeAwarded' in r && 'totalTickets' in r) {
        console.log(`   ✓ Exitoso`)
        console.log(`   - Ganador: ${r.winnerId || 'Ninguno'}`)
        console.log(`   - Premio: ${r.prizeAwarded} USD`)
        console.log(`   - Boletos: ${r.totalTickets}`)
      } else if (!r.success && 'error' in r) {
        console.log(`   ✗ Error: ${r.error}`)
      }
    })
  } catch (error) {
    console.error('Error fatal al ejecutar sorteos:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
  
  console.log('\n=== Ejecución completada ===')
}

// Si se ejecuta directamente
if (require.main === module) {
  main().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}
