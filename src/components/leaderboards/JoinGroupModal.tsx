'use client'

import React, { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { X, Users, Key, Search } from 'lucide-react'

interface JoinGroupModalProps {
  onClose: () => void
  onSuccess: () => void
}

export default function JoinGroupModal({ onClose, onSuccess }: JoinGroupModalProps) {
  const [inviteCode, setInviteCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!inviteCode.trim()) {
      setError('El código de invitación es requerido')
      return
    }

    try {
      setLoading(true)
      setError('')
      setSuccess('')

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuario no autenticado')

      const { data, error: joinError } = await supabase
        .rpc('join_group_with_code', {
          user_id_param: user.id,
          invite_code_param: inviteCode.trim().toUpperCase()
        })

      if (joinError) throw joinError

      if (data === false) {
        setError('Código de invitación inválido, grupo lleno, o ya eres miembro')
        return
      }

      setSuccess('¡Te has unido al grupo exitosamente!')
      setTimeout(() => {
        onSuccess()
      }, 1500)

    } catch (error: any) {
      console.error('Error joining group:', error)
      setError(error.message || 'Error al unirse al grupo')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md border border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Unirse a Grupo</h2>
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

          {success && (
            <div className="bg-green-500/20 border border-green-500/30 text-green-400 px-4 py-3 rounded-lg text-sm">
              {success}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Código de Invitación *
            </label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="Ej: ABC12345"
                className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg pl-10 pr-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-center text-lg tracking-wider"
                maxLength={8}
                required
              />
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Introduce el código de 8 caracteres que te proporcionó el administrador del grupo
            </p>
          </div>

          <div className="bg-gray-700/50 rounded-lg p-4">
            <h3 className="text-white font-medium mb-2 flex items-center space-x-2">
              <Search className="w-4 h-4" />
              <span>¿Cómo obtener un código?</span>
            </h3>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>• Pide a un miembro del grupo que comparta el código</li>
              <li>• Busca el código en las tarjetas de grupo de tus amigos</li>
              <li>• Los códigos son únicos para cada grupo</li>
            </ul>
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
              disabled={loading || !inviteCode.trim() || success !== ''}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Uniéndose...</span>
                </>
              ) : success ? (
                <>
                  <Users className="w-4 h-4" />
                  <span>¡Unido!</span>
                </>
              ) : (
                <>
                  <Users className="w-4 h-4" />
                  <span>Unirse</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
} 