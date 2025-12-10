'use client'

/**
 * Componente para mostrar noticias del sistema
 * Muestra noticias activas para todos los usuarios
 */

import React, { useState, useEffect } from 'react'
import { getActiveNews } from '@/app/actions/news'

type Props = {
  selectedTheme?: string
}

export default function NewsSection({ selectedTheme = 'claro' }: Props) {
  const [news, setNews] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadNews()
  }, [])

  const loadNews = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await getActiveNews()
      if (result.ok) {
        setNews(result.news || [])
      } else {
        setError(result.error || 'Error al cargar noticias')
      }
    } catch (err) {
      setError('Error al cargar noticias')
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

  if (loading) {
    return (
      <div
        className={`${
          selectedTheme === 'oscuro'
            ? 'bg-gray-800 border-gray-600'
            : 'bg-white border-gray-200'
        } rounded-xl border p-4 sm:p-6`}
      >
        <div className="text-center py-8">
          <i className="ri-loader-4-line animate-spin text-3xl text-blue-600"></i>
          <p
            className={`mt-2 ${
              selectedTheme === 'oscuro' ? 'text-gray-400' : 'text-gray-600'
            }`}
          >
            Cargando noticias...
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div
        className={`${
          selectedTheme === 'oscuro'
            ? 'bg-gray-800 border-gray-600'
            : 'bg-white border-gray-200'
        } rounded-xl border p-4 sm:p-6`}
      >
        <div className="text-center py-8">
          <i className="ri-error-warning-line text-4xl text-red-600 mb-3"></i>
          <p className={`${selectedTheme === 'oscuro' ? 'text-gray-400' : 'text-gray-600'}`}>
            {error}
          </p>
        </div>
      </div>
    )
  }

  if (news.length === 0) {
    return null // No mostrar nada si no hay noticias
  }

  return (
    <div className="space-y-4">
      <h3
        className={`text-lg sm:text-xl font-bold ${
          selectedTheme === 'oscuro' ? 'text-white' : 'text-gray-800'
        }`}
      >
        📰 Noticias y Anuncios
      </h3>

      <div
        className={`${
          selectedTheme === 'oscuro'
            ? 'bg-gray-800 border-gray-600'
            : 'bg-white border-gray-200'
        } rounded-xl border p-4 sm:p-6`}
      >
        <div className="space-y-4">
          {news.map((item) => (
            <div
              key={item.id}
              className={`${
                selectedTheme === 'oscuro'
                  ? 'bg-gray-700 border-gray-600'
                  : 'bg-gray-50 border-gray-200'
              } border rounded-lg p-4`}
            >
              <div className="flex justify-between items-start mb-2">
                <h4
                  className={`font-semibold text-lg ${
                    selectedTheme === 'oscuro' ? 'text-white' : 'text-gray-800'
                  }`}
                >
                  {item.title}
                </h4>
                <span
                  className={`text-xs ${
                    selectedTheme === 'oscuro' ? 'text-gray-400' : 'text-gray-500'
                  }`}
                >
                  {formatDate(item.createdAt)}
                </span>
              </div>

              <div
                className={`text-sm ${
                  selectedTheme === 'oscuro' ? 'text-gray-300' : 'text-gray-700'
                } whitespace-pre-line`}
              >
                {item.content}
              </div>

              {item.author && (
                <div
                  className={`mt-3 text-xs ${
                    selectedTheme === 'oscuro' ? 'text-gray-400' : 'text-gray-500'
                  }`}
                >
                  <i className="ri-user-line mr-1"></i>
                  {item.author.name || item.author.email || 'Administración'}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
