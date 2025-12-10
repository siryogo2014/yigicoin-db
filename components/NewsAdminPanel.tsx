'use client'

/**
 * Panel de administración de noticias (solo para owners)
 * Permite crear, editar, activar/desactivar y eliminar noticias
 */

import React, { useState, useEffect } from 'react'
import {
  getAllNews,
  createNews,
  updateNews,
  deleteNews,
  toggleNewsActive,
} from '@/app/actions/news'

type Props = {
  userId: string
  selectedTheme?: string
}

type NewsItem = {
  id: string
  title: string
  content: string
  isActive: boolean
  createdAt: Date | string
  updatedAt: Date | string
  author?: {
    name?: string | null
    email?: string | null
  }
}

export default function NewsAdminPanel({ userId, selectedTheme = 'claro' }: Props) {
  const [news, setNews] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    isActive: true,
  })

  useEffect(() => {
    loadNews()
  }, [])

  const loadNews = async () => {
    setLoading(true)
    try {
      const result = await getAllNews(userId)
      if (result.ok) {
        setNews(result.news || [])
      }
    } catch (err) {
      console.error('Error loading news:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.title.trim() || !formData.content.trim()) {
      alert('Título y contenido son requeridos')
      return
    }

    try {
      let result
      if (editingId) {
        result = await updateNews(
          userId,
          editingId,
          formData.title,
          formData.content,
          formData.isActive
        )
      } else {
        result = await createNews(userId, formData.title, formData.content, formData.isActive)
      }

      if (result.ok) {
        setFormData({ title: '', content: '', isActive: true })
        setShowForm(false)
        setEditingId(null)
        loadNews()
        // @ts-ignore
        window?.YigiToast?.success?.(
          editingId ? 'Noticia actualizada' : 'Noticia creada'
        )
      } else {
        // @ts-ignore
        window?.YigiToast?.error?.(result.error || 'Error al guardar noticia')
      }
    } catch (err) {
      // @ts-ignore
      window?.YigiToast?.error?.('Error al guardar noticia')
    }
  }

  const handleEdit = (item: NewsItem) => {
    setEditingId(item.id)
    setFormData({
      title: item.title,
      content: item.content,
      isActive: item.isActive,
    })
    setShowForm(true)
  }

  const handleDelete = async (newsId: string) => {
    if (!confirm('¿Estás seguro de eliminar esta noticia?')) {
      return
    }

    try {
      const result = await deleteNews(userId, newsId)
      if (result.ok) {
        loadNews()
        // @ts-ignore
        window?.YigiToast?.success?.('Noticia eliminada')
      } else {
        // @ts-ignore
        window?.YigiToast?.error?.(result.error || 'Error al eliminar noticia')
      }
    } catch (err) {
      // @ts-ignore
      window?.YigiToast?.error?.('Error al eliminar noticia')
    }
  }

  const handleToggleActive = async (newsId: string) => {
    try {
      const result = await toggleNewsActive(userId, newsId)
      if (result.ok) {
        loadNews()
        // @ts-ignore
        window?.YigiToast?.success?.('Estado actualizado')
      } else {
        // @ts-ignore
        window?.YigiToast?.error?.(result.error || 'Error al actualizar estado')
      }
    } catch (err) {
      // @ts-ignore
      window?.YigiToast?.error?.('Error al actualizar estado')
    }
  }

  const handleCancel = () => {
    setFormData({ title: '', content: '', isActive: true })
    setShowForm(false)
    setEditingId(null)
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

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3
          className={`text-lg sm:text-xl font-bold ${
            selectedTheme === 'oscuro' ? 'text-white' : 'text-gray-800'
          }`}
        >
          🛠️ Panel de Noticias (Admin)
        </h3>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <i className="ri-add-line mr-2"></i>
            Nueva Noticia
          </button>
        )}
      </div>

      {/* Formulario */}
      {showForm && (
        <div
          className={`${
            selectedTheme === 'oscuro'
              ? 'bg-gray-800 border-gray-600'
              : 'bg-white border-gray-200'
          } rounded-xl border p-4 sm:p-6`}
        >
          <h4
            className={`font-semibold mb-4 ${
              selectedTheme === 'oscuro' ? 'text-white' : 'text-gray-800'
            }`}
          >
            {editingId ? 'Editar Noticia' : 'Nueva Noticia'}
          </h4>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                className={`block text-sm font-medium mb-2 ${
                  selectedTheme === 'oscuro' ? 'text-gray-300' : 'text-gray-700'
                }`}
              >
                Título
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className={`w-full px-4 py-2 rounded-lg border ${
                  selectedTheme === 'oscuro'
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                placeholder="Título de la noticia"
                required
              />
            </div>

            <div>
              <label
                className={`block text-sm font-medium mb-2 ${
                  selectedTheme === 'oscuro' ? 'text-gray-300' : 'text-gray-700'
                }`}
              >
                Contenido
              </label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows={6}
                className={`w-full px-4 py-2 rounded-lg border ${
                  selectedTheme === 'oscuro'
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                placeholder="Contenido de la noticia"
                required
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="mr-2"
              />
              <label
                htmlFor="isActive"
                className={`text-sm ${
                  selectedTheme === 'oscuro' ? 'text-gray-300' : 'text-gray-700'
                }`}
              >
                Noticia activa (visible para usuarios)
              </label>
            </div>

            <div className="flex space-x-3">
              <button
                type="submit"
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                {editingId ? 'Actualizar' : 'Crear'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                  selectedTheme === 'oscuro'
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de noticias */}
      <div
        className={`${
          selectedTheme === 'oscuro'
            ? 'bg-gray-800 border-gray-600'
            : 'bg-white border-gray-200'
        } rounded-xl border p-4 sm:p-6`}
      >
        {loading ? (
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
        ) : news.length === 0 ? (
          <div className="text-center py-8">
            <i className="ri-newspaper-line text-4xl text-gray-400 mb-3"></i>
            <p className={`${selectedTheme === 'oscuro' ? 'text-gray-400' : 'text-gray-600'}`}>
              No hay noticias aún
            </p>
          </div>
        ) : (
          <div className="space-y-3">
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
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4
                        className={`font-semibold ${
                          selectedTheme === 'oscuro' ? 'text-white' : 'text-gray-800'
                        }`}
                      >
                        {item.title}
                      </h4>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          item.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {item.isActive ? 'Activa' : 'Inactiva'}
                      </span>
                    </div>
                    <p
                      className={`text-sm ${
                        selectedTheme === 'oscuro' ? 'text-gray-300' : 'text-gray-700'
                      } whitespace-pre-line`}
                    >
                      {item.content}
                    </p>
                    <p
                      className={`text-xs mt-2 ${
                        selectedTheme === 'oscuro' ? 'text-gray-400' : 'text-gray-500'
                      }`}
                    >
                      Creada: {formatDate(item.createdAt)} | Actualizada:{' '}
                      {formatDate(item.updatedAt)}
                    </p>
                  </div>
                </div>

                <div className="flex space-x-2 mt-3">
                  <button
                    onClick={() => handleEdit(item)}
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                  >
                    <i className="ri-edit-line mr-1"></i>
                    Editar
                  </button>
                  <button
                    onClick={() => handleToggleActive(item.id)}
                    className={`px-3 py-1 text-white text-sm rounded ${
                      item.isActive
                        ? 'bg-yellow-600 hover:bg-yellow-700'
                        : 'bg-green-600 hover:bg-green-700'
                    }`}
                  >
                    <i className={`mr-1 ${item.isActive ? 'ri-eye-off-line' : 'ri-eye-line'}`}></i>
                    {item.isActive ? 'Desactivar' : 'Activar'}
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                  >
                    <i className="ri-delete-bin-line mr-1"></i>
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
