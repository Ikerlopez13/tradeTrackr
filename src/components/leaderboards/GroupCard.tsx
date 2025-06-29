'use client'

import React, { useState } from 'react'
import { Users, Calendar, Crown, Copy, MoreVertical, LogOut, Settings, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Group {
  id: string
  name: string
  description?: string
  created_by: string
  invite_code: string
  is_public: boolean
  max_members: number
  member_count: number
  created_at: string
  user_role?: string
}

interface GroupCardProps {
  group: Group
  isSelected: boolean
  onClick: () => void
  currentUserId?: string
  onLeaveGroup?: (groupId: string) => void
}

export default function GroupCard({ group, isSelected, onClick, currentUserId, onLeaveGroup }: GroupCardProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)
  const supabase = createClient()

  const copyInviteCode = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(group.invite_code)
    // Aquí podrías agregar una notificación de éxito
  }

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowMenu(!showMenu)
  }

  const handleLeaveGroup = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!currentUserId) return
    
    setIsLeaving(true)
    try {
      const { data, error } = await supabase.rpc('leave_group', {
        user_id_param: currentUserId,
        group_id_param: group.id
      })

      if (error) throw error

      if (data) {
        // Éxito al salir del grupo
        if (onLeaveGroup) {
          onLeaveGroup(group.id)
        }
      } else {
        console.error('No se pudo salir del grupo')
      }
    } catch (error) {
      console.error('Error leaving group:', error)
    } finally {
      setIsLeaving(false)
      setShowLeaveConfirm(false)
      setShowMenu(false)
    }
  }

  const isCreator = currentUserId === group.created_by
  const isAdmin = group.user_role === 'admin'

  return (
    <div 
      className={`
        relative bg-gray-800/60 backdrop-blur-sm rounded-lg p-4 border cursor-pointer
        transition-all duration-200 hover:bg-gray-800/80 hover:border-gray-600
        ${isSelected ? 'border-blue-500 ring-2 ring-blue-500/30' : 'border-gray-700'}
      `}
      onClick={onClick}
    >
      {/* Menú de opciones */}
      <div className="absolute top-3 right-3">
        <button
          onClick={handleMenuClick}
          className="p-1 rounded-full hover:bg-gray-700/50 transition-colors"
        >
          <MoreVertical className="w-4 h-4 text-gray-400" />
        </button>
        
        {showMenu && (
          <div className="absolute right-0 top-8 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-10 min-w-[150px]">
            <div className="py-1">
              {isAdmin && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowMenu(false)
                    // Aquí podrías abrir un modal de configuración
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 flex items-center space-x-2"
                >
                  <Settings className="w-4 h-4" />
                  <span>Configurar</span>
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowMenu(false)
                  setShowLeaveConfirm(true)
                }}
                className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-gray-700 flex items-center space-x-2"
              >
                <LogOut className="w-4 h-4" />
                <span>{isCreator ? 'Eliminar grupo' : 'Salir del grupo'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Confirmación para salir */}
      {showLeaveConfirm && (
        <div className="absolute inset-0 bg-gray-900/90 backdrop-blur-sm rounded-lg flex items-center justify-center z-20">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 max-w-sm">
            <div className="flex items-center space-x-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
              <h3 className="text-white font-medium">
                {isCreator ? 'Eliminar grupo' : 'Salir del grupo'}
              </h3>
            </div>
            <p className="text-gray-400 text-sm mb-4">
              {isCreator 
                ? 'Al eliminar el grupo, todos los miembros serán removidos y se perderán todos los datos.'
                : '¿Estás seguro de que quieres salir de este grupo?'
              }
            </p>
            <div className="flex space-x-2">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowLeaveConfirm(false)
                }}
                className="flex-1 px-3 py-2 text-sm text-gray-400 border border-gray-600 rounded hover:bg-gray-700 transition-colors"
                disabled={isLeaving}
              >
                Cancelar
              </button>
              <button
                onClick={handleLeaveGroup}
                className="flex-1 px-3 py-2 text-sm text-white bg-red-600 hover:bg-red-700 rounded transition-colors"
                disabled={isLeaving}
              >
                {isLeaving ? 'Saliendo...' : (isCreator ? 'Eliminar' : 'Salir')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contenido principal */}
      <div className="space-y-3 pr-8">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-white font-semibold text-lg flex items-center space-x-2">
              <span>{group.name}</span>
              {isCreator && <Crown className="w-4 h-4 text-yellow-400" />}
              {isAdmin && !isCreator && <Settings className="w-4 h-4 text-blue-400" />}
            </h3>
            {group.description && (
              <p className="text-gray-400 text-sm mt-1">{group.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1 text-gray-400">
              <Users className="w-4 h-4" />
              <span>{group.member_count}/{group.max_members}</span>
            </div>
            
            <div className="flex items-center space-x-1 text-gray-400">
              <Calendar className="w-4 h-4" />
              <span>{new Date(group.created_at).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}</span>
            </div>
          </div>

          <button
            onClick={copyInviteCode}
            className="flex items-center space-x-1 text-blue-400 hover:text-blue-300 transition-colors"
            title="Copiar código de invitación"
          >
            <Copy className="w-4 h-4" />
            <span className="font-mono text-xs">{group.invite_code}</span>
          </button>
        </div>

        {/* Barra de progreso de miembros */}
        <div className="mt-3">
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(group.member_count / group.max_members) * 100}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  )
} 