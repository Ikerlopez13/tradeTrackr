'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TrendingUp, TrendingDown, Calendar, User, Target, DollarSign, Clock, X } from 'lucide-react'
import Image from 'next/image'
import { getSafeDisplayName, getUserInitials } from '@/utils/userUtils'

interface GroupTrade {
  id: string
  title: string
  pair: string
  timeframe: string
  result: 'win' | 'loss' | 'breakeven'
  pnl_percentage?: number
  pnl_money?: number
  pnl_pips?: number
  created_at: string
  screenshot_url?: string
  user_id: string
  username: string
  avatar_url?: string
  is_premium: boolean
  description?: string
  bias?: string
  confluences?: string
  risk_reward?: string
  session?: string
  feeling?: number
}

interface GroupTradeFeedProps {
  groupId: string
  currentUserId?: string
}

export default function GroupTradeFeed({ groupId, currentUserId }: GroupTradeFeedProps) {
  const [trades, setTrades] = useState<GroupTrade[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTrade, setSelectedTrade] = useState<GroupTrade | null>(null)
  const [showModal, setShowModal] = useState(false)
  
  const supabase = createClient()

  useEffect(() => {
    loadGroupTrades()
  }, [groupId])

  const loadGroupTrades = async () => {
    try {
      setLoading(true)
      
      // Primero obtener los IDs de usuarios del grupo
      const { data: memberIds, error: memberError } = await supabase
        .from('group_memberships')
        .select('user_id')
        .eq('group_id', groupId)

      if (memberError) throw memberError
      
      const userIds = memberIds?.map(m => m.user_id) || []
      
      if (userIds.length === 0) {
        setTrades([])
        return
      }

      // Obtener trades públicos de los miembros del grupo
      const { data, error } = await supabase
        .from('trades')
        .select(`
          id,
          title,
          pair,
          timeframe,
          result,
          pnl_percentage,
          pnl_money,
          pnl_pips,
          created_at,
          screenshot_url,
          user_id,
          description,
          bias,
          confluences,
          risk_reward,
          session,
          feeling,
          profiles!inner(
            username,
            avatar_url,
            is_premium
          )
        `)
        .in('user_id', userIds)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error

      const formattedTrades = data?.map((trade: any) => ({
        ...trade,
        username: trade.profiles.username,
        avatar_url: trade.profiles.avatar_url,
        is_premium: trade.profiles.is_premium
      })) || []

      setTrades(formattedTrades)
    } catch (error) {
      console.error('Error loading group trades:', error)
    } finally {
      setLoading(false)
    }
  }

  const getResultColor = (result: string) => {
    switch (result) {
      case 'win': return 'text-green-400'
      case 'loss': return 'text-red-400'
      default: return 'text-yellow-400'
    }
  }

  const getResultIcon = (result: string) => {
    switch (result) {
      case 'win': return <TrendingUp className="w-4 h-4" />
      case 'loss': return <TrendingDown className="w-4 h-4" />
      default: return <Target className="w-4 h-4" />
    }
  }

  const openTradeModal = (trade: GroupTrade) => {
    setSelectedTrade(trade)
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setSelectedTrade(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Image
            src="/logo.jpeg"
            alt="TradeTrackr Logo"
            width={60}
            height={60}
            priority
            unoptimized
            className="rounded-lg animate-scale-cycle mx-auto mb-3"
          />
          <div className="text-white text-sm font-medium">Cargando trades del grupo...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-medium text-lg flex items-center space-x-2">
          <TrendingUp className="w-5 h-5 text-blue-400" />
          <span>Feed de Trades del Grupo</span>
        </h3>
        <span className="text-gray-400 text-sm">{trades.length} trades</span>
      </div>

      {trades.length === 0 ? (
        <div className="text-center py-8">
          <TrendingUp className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 mb-2">
            No hay trades públicos en este grupo aún
          </p>
          <div className="text-sm text-gray-500 space-y-1">
            <p>Para que aparezcan trades aquí:</p>
            <ul className="list-disc list-inside space-y-1 text-left max-w-md mx-auto">
              <li>Los miembros del grupo deben crear trades</li>
              <li>Los trades deben estar marcados como "públicos"</li>
              <li>Activa el toggle "Compartir en el Feed Público" al crear un trade</li>
            </ul>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {trades.map((trade) => {
            // Get safe display name for each trade
            const displayName = getSafeDisplayName(trade.username)
            const userInitials = getUserInitials(trade.username)
            
            return (
              <div
                key={trade.id}
                onClick={() => openTradeModal(trade)}
                className="bg-gray-800/40 backdrop-blur-sm rounded-lg p-4 border border-gray-700 hover:bg-gray-800/60 transition-all duration-200 cursor-pointer hover:border-gray-600"
              >
                <div className="flex items-start space-x-3">
                  {/* Avatar del usuario */}
                  <div className="relative flex-shrink-0">
                    {trade.avatar_url ? (
                      <img
                        src={trade.avatar_url}
                        alt={displayName}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-sm">
                          {userInitials}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Contenido del trade */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <h4 className="text-white font-medium text-sm truncate">
                          {displayName}
                        </h4>
                        <span className="text-gray-400 text-xs">
                          {new Date(trade.created_at).toLocaleDateString('es-ES', {
                            day: 'numeric',
                            month: 'short'
                          })}
                        </span>
                      </div>
                      
                      <div className={`flex items-center space-x-1 ${getResultColor(trade.result)}`}>
                        {getResultIcon(trade.result)}
                        <span className="text-sm font-medium capitalize">{trade.result}</span>
                      </div>
                    </div>

                    <h5 className="text-white font-medium mb-2 truncate">{trade.title}</h5>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-400">
                      <span>{trade.pair}</span>
                      <span>{trade.timeframe}</span>
                      {trade.pnl_percentage && (
                        <span className={`font-medium ${
                          trade.pnl_percentage > 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {trade.pnl_percentage > 0 ? '+' : ''}{trade.pnl_percentage.toFixed(2)}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal de detalle del trade */}
      {showModal && selectedTrade && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header del modal */}
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                  {selectedTrade.avatar_url ? (
                    <img 
                      src={selectedTrade.avatar_url} 
                      alt={getSafeDisplayName(selectedTrade.username)} 
                      className="w-full h-full rounded-full object-cover" 
                    />
                  ) : (
                    <span className="text-white font-bold text-sm">
                      {getUserInitials(selectedTrade.username)}
                    </span>
                  )}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">{selectedTrade.title}</h2>
                  <div className="flex items-center space-x-1 text-gray-400 text-sm">
                    <span>por {getSafeDisplayName(selectedTrade.username)}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            {/* Contenido del modal */}
            <div className="p-6 space-y-6">
              {/* Imagen */}
              {selectedTrade.screenshot_url && (
                <div>
                  <img
                    src={selectedTrade.screenshot_url}
                    alt={`Screenshot de ${selectedTrade.title}`}
                    className="w-full rounded-lg"
                  />
                </div>
              )}
              
              {/* Información del trade */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <span className="text-gray-400 text-sm">Par:</span>
                    <div className="text-white font-medium">{selectedTrade.pair}</div>
                  </div>
                  <div>
                    <span className="text-gray-400 text-sm">Timeframe:</span>
                    <div className="text-white font-medium">{selectedTrade.timeframe}</div>
                  </div>
                  {selectedTrade.session && (
                    <div>
                      <span className="text-gray-400 text-sm">Sesión:</span>
                      <div className="text-white font-medium">
                        {selectedTrade.session === 'asian' ? 'Asiática' : 
                         selectedTrade.session === 'london' ? 'Londres' : 
                         selectedTrade.session === 'newyork' ? 'Nueva York' : 
                         'Solapamiento'}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="space-y-3">
                  <div>
                    <span className="text-gray-400 text-sm">Bias:</span>
                    <div className="text-white font-medium">
                      {selectedTrade.bias === 'alcista' ? 'Alcista' : 
                       selectedTrade.bias === 'bajista' ? 'Bajista' : selectedTrade.bias}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-400 text-sm">Resultado:</span>
                    <div className={`font-medium ${getResultColor(selectedTrade.result)}`}>
                      {selectedTrade.result === 'win' ? 'Win' : 
                       selectedTrade.result === 'loss' ? 'Loss' : 
                       'Break Even'}
                    </div>
                  </div>
                  {selectedTrade.risk_reward && (
                    <div>
                      <span className="text-gray-400 text-sm">Risk:Reward:</span>
                      <div className="text-white font-medium">{selectedTrade.risk_reward}</div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* P&L */}
              {(selectedTrade.pnl_percentage || selectedTrade.pnl_money || selectedTrade.pnl_pips) && (
                <div className="bg-gray-900/50 rounded-lg p-4">
                  <h3 className="text-gray-400 text-sm mb-3">Resultado del Trade</h3>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    {selectedTrade.pnl_percentage && (
                      <div>
                        <div className={`text-xl font-bold ${
                          selectedTrade.pnl_percentage > 0 ? 'text-green-400' : 
                          selectedTrade.pnl_percentage < 0 ? 'text-red-400' : 'text-gray-400'
                        }`}>
                          {selectedTrade.pnl_percentage > 0 ? '+' : ''}{selectedTrade.pnl_percentage.toFixed(2)}%
                        </div>
                        <div className="text-gray-500 text-xs">Porcentaje</div>
                      </div>
                    )}
                    {selectedTrade.pnl_money && (
                      <div>
                        <div className={`text-xl font-bold ${
                          selectedTrade.pnl_money > 0 ? 'text-green-400' : 
                          selectedTrade.pnl_money < 0 ? 'text-red-400' : 'text-gray-400'
                        }`}>
                          {selectedTrade.pnl_money > 0 ? '+' : ''}${Math.abs(selectedTrade.pnl_money).toFixed(2)}
                        </div>
                        <div className="text-gray-500 text-xs">Dinero</div>
                      </div>
                    )}
                    {selectedTrade.pnl_pips && (
                      <div>
                        <div className={`text-xl font-bold ${
                          selectedTrade.pnl_pips > 0 ? 'text-green-400' : 
                          selectedTrade.pnl_pips < 0 ? 'text-red-400' : 'text-gray-400'
                        }`}>
                          {selectedTrade.pnl_pips > 0 ? '+' : ''}{selectedTrade.pnl_pips.toFixed(1)}
                        </div>
                        <div className="text-gray-500 text-xs">Pips</div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Sentimiento */}
              {selectedTrade.feeling && (
                <div className="bg-gray-900/50 rounded-lg p-4">
                  <h3 className="text-gray-400 text-sm mb-3">Análisis de Sentimiento</h3>
                  <div className="flex items-center justify-center space-x-4">
                    <span className="text-3xl">
                      {selectedTrade.feeling <= 30 ? '😞' : 
                       selectedTrade.feeling <= 70 ? '🤔' : '😊'}
                    </span>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-white">{selectedTrade.feeling}%</div>
                      <div className="text-gray-400 text-sm">
                        {selectedTrade.feeling <= 30 ? 'Frustrado' : 
                         selectedTrade.feeling <= 70 ? 'Neutral' : 'Confiable'}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Confluencias */}
              {selectedTrade.confluences && (
                <div className="bg-gray-900/50 rounded-lg p-4">
                  <h3 className="text-gray-400 text-sm mb-3">Confluencias</h3>
                  <p className="text-white">{selectedTrade.confluences}</p>
                </div>
              )}
              
              {/* Descripción */}
              {selectedTrade.description && (
                <div className="bg-gray-900/50 rounded-lg p-4">
                  <h3 className="text-gray-400 text-sm mb-3">Descripción</h3>
                  <p className="text-white">{selectedTrade.description}</p>
                </div>
              )}
              
              {/* Fecha */}
              <div className="text-center text-gray-400 text-sm pt-4 border-t border-gray-700">
                Publicado el {new Date(selectedTrade.created_at).toLocaleDateString('es-ES', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 