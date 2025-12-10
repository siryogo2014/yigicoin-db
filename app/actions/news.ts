'use server'

/**
 * News Server Actions
 * - CRUD operations for news (only for owners)
 * - Get active news for users
 */

import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'

/** Require userId explicitly */
function requireUserId(userId?: string): string {
  if (userId) return userId
  throw new Error('Missing userId.')
}

/**
 * Check if user is owner
 */
async function checkIsOwner(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isOwner: true },
  })
  return user?.isOwner ?? false
}

/**
 * Get all active news (public)
 */
export async function getActiveNews() {
  try {
    const news = await prisma.news.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      include: {
        author: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    })
    return { ok: true as const, news }
  } catch (error: any) {
    return { ok: false as const, error: error?.message ?? 'Error al cargar noticias' }
  }
}

/**
 * Get all news (for owners)
 */
export async function getAllNews(userId?: string) {
  const id = requireUserId(userId)
  
  try {
    const isOwner = await checkIsOwner(id)
    if (!isOwner) {
      return { ok: false as const, error: 'No tienes permisos para ver todas las noticias' }
    }

    const news = await prisma.news.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        author: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    })
    return { ok: true as const, news }
  } catch (error: any) {
    return { ok: false as const, error: error?.message ?? 'Error al cargar noticias' }
  }
}

/**
 * Create news (only for owners)
 */
export async function createNews(
  userId?: string,
  title?: string,
  content?: string,
  isActive: boolean = true
) {
  const id = requireUserId(userId)
  
  if (!title || !content) {
    return { ok: false as const, error: 'Título y contenido son requeridos' }
  }

  try {
    const isOwner = await checkIsOwner(id)
    if (!isOwner) {
      return { ok: false as const, error: 'No tienes permisos para crear noticias' }
    }

    const news = await prisma.news.create({
      data: {
        title,
        content,
        isActive,
        authorId: id,
      },
      include: {
        author: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    })

    return { ok: true as const, news }
  } catch (error: any) {
    return { ok: false as const, error: error?.message ?? 'Error al crear noticia' }
  }
}

/**
 * Update news (only for owners)
 */
export async function updateNews(
  userId?: string,
  newsId?: string,
  title?: string,
  content?: string,
  isActive?: boolean
) {
  const id = requireUserId(userId)
  
  if (!newsId) {
    return { ok: false as const, error: 'ID de noticia es requerido' }
  }

  try {
    const isOwner = await checkIsOwner(id)
    if (!isOwner) {
      return { ok: false as const, error: 'No tienes permisos para actualizar noticias' }
    }

    const data: any = {}
    if (title !== undefined) data.title = title
    if (content !== undefined) data.content = content
    if (isActive !== undefined) data.isActive = isActive

    const news = await prisma.news.update({
      where: { id: newsId },
      data,
      include: {
        author: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    })

    return { ok: true as const, news }
  } catch (error: any) {
    return { ok: false as const, error: error?.message ?? 'Error al actualizar noticia' }
  }
}

/**
 * Delete news (only for owners)
 */
export async function deleteNews(userId?: string, newsId?: string) {
  const id = requireUserId(userId)
  
  if (!newsId) {
    return { ok: false as const, error: 'ID de noticia es requerido' }
  }

  try {
    const isOwner = await checkIsOwner(id)
    if (!isOwner) {
      return { ok: false as const, error: 'No tienes permisos para eliminar noticias' }
    }

    await prisma.news.delete({
      where: { id: newsId },
    })

    return { ok: true as const }
  } catch (error: any) {
    return { ok: false as const, error: error?.message ?? 'Error al eliminar noticia' }
  }
}

/**
 * Toggle news active status (only for owners)
 */
export async function toggleNewsActive(userId?: string, newsId?: string) {
  const id = requireUserId(userId)
  
  if (!newsId) {
    return { ok: false as const, error: 'ID de noticia es requerido' }
  }

  try {
    const isOwner = await checkIsOwner(id)
    if (!isOwner) {
      return { ok: false as const, error: 'No tienes permisos para modificar noticias' }
    }

    const currentNews = await prisma.news.findUnique({
      where: { id: newsId },
      select: { isActive: true },
    })

    if (!currentNews) {
      return { ok: false as const, error: 'Noticia no encontrada' }
    }

    const news = await prisma.news.update({
      where: { id: newsId },
      data: { isActive: !currentNews.isActive },
      include: {
        author: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    })

    return { ok: true as const, news }
  } catch (error: any) {
    return { ok: false as const, error: error?.message ?? 'Error al modificar noticia' }
  }
}
