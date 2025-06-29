'use client'

import React, { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { X, Users, Lock, Globe } from 'lucide-react'

interface CreateGroupModalProps {
  onClose: () => void
  onSuccess: () => void
}

export default function CreateGroupModal({ onClose, onSuccess }: CreateGroupModalProps) {
  const [groupName, setGroupName] = useState('')
  const [description, setDescription] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [maxMembers, setMaxMembers] = useState(20)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!groupName.trim()) {
      setError('El nombre del grupo es requerido')
      return
    }

    try {
      setLoading(true)
      setError('')

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuario no autenticado')

      const { data, error: createError } = await supabase
        .rpc('create_friend_group', {
          creator_id: user.id,
          group_name: groupName.trim(),
          group_description: description.trim() || null,
          is_public_param: isPublic
        })

      if (createError) throw createError

      onSuccess()
    } catch (error: any) {
      console.error('Error creating group:', error)
      setError(error.message || 'Error al crear el grupo')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md border border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Crear Grupo</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-500/20 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Nombre del Grupo *
            </label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Ej: Traders Elite"
              className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              maxLength={50}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Descripción (opcional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe tu grupo de trading..."
              className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={3}
              maxLength={200}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Límite de Miembros
            </label>
            <select
              value={maxMembers}
              onChange={(e) => setMaxMembers(Number(e.target.value))}
              className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value={5}>5 miembros</option>
              <option value={10}>10 miembros</option>
              <option value={20}>20 miembros</option>
              <option value={50}>50 miembros</option>
              <option value={100}>100 miembros</option>
            </select>
          </div>

          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="isPublic"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
            />
            <label htmlFor="isPublic" className="text-sm text-gray-300 flex items-center space-x-2">
              {isPublic ? (
                <>
                  <Globe className="w-4 h-4 text-green-400" />
                  <span>Grupo público (visible para todos)</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 text-gray-400" />
                  <span>Grupo privado (solo por invitación)</span>
                </>
              )}
            </label>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-4 py-3 rounded-lg font-medium transition-colors"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !groupName.trim()}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Creando...</span>
                </>
              ) : (
                <>
                  <Users className="w-4 h-4" />
                  <span>Crear Grupo</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
} 