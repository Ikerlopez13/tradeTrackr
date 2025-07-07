'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Trophy, TrendingUp, TrendingDown, Minus, Clock, User, BarChart3, Heart, BadgeCheck } from 'lucide-react'
import { getSafeDisplayName, getUserInitials } from '@/utils/userUtils'
import Layout from '@/components/Layout'
import LoadingSpinner from '@/components/LoadingSpinner'

interface PublicTrade {
  id: string
  title: string
  pair: string
  timeframe: string
  bias: string
  result: string
  risk_reward: string
  pnl_percentage: number
  pnl_pips: number
  pnl_money: number
  screenshot_url: string
  created_at: string
  username: string
  avatar_url: string
  wins: number
  losses: number
  win_rate: number
  total_pnl_percentage: number
  description?: string
  confluences?: string
  session?: string
  feeling?: number
  likes_count: number
  is_premium: boolean
}

interface LikeData {
  count: number
  isLiked: boolean
}

export default function FeedPage() {
  const [trades, setTrades] = useState<PublicTrade[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)
  const [user, setUser] = useState<any>(null)
  const [showModal, setShowModal] = useState(false)
  const [selectedTrade, setSelectedTrade] = useState<PublicTrade | null>(null)
  const [likesData, setLikesData] = useState<{[tradeId: string]: LikeData}>({})
  const [loadingLike, setLoadingLike] = useState<{[tradeId: string]: boolean}>({})
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }
      setUser(user)
      
      // Cargar datos del usuario
      await loadUserData(user.id)
    }
    
    getUser()
  }, [router])

  const loadUserData = async (userId: string) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Error loading user profile:', error)
        return
      }

      setUser((prev: any) => ({ ...prev, profile }))
    } catch (error) {
      console.error('Error loading user data:', error)
    }
  }

  const loadTrades = async (pageNumber = 1) => {
    try {
      setLoading(pageNumber === 1)
      setLoadingMore(pageNumber > 1)
      
      const limit = 20
      const offset = (pageNumber - 1) * limit
      
      const response = await fetch(`/api/feed?page=${pageNumber}&limit=${limit}`)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Error loading trades')
      }
      
      if (pageNumber === 1) {
        setTrades(data.trades)
      } else {
        setTrades(prev => [...prev, ...data.trades])
      }
      
      setHasMore(data.trades.length === limit)
      
      // Cargar likes para todos los trades en batch
      if (data.trades.length > 0) {
        await loadLikesBatch(data.trades.map((trade: PublicTrade) => trade.id))
      }
      
    } catch (error) {
      console.error('Error loading trades:', error)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  const loadLikesBatch = async (tradeIds: string[]) => {
    try {
      // Cargar likes para múltiples trades de una vez
      const likesPromises = tradeIds.map(async (tradeId) => {
        try {
          const response = await fetch(`/api/likes?trade_id=${tradeId}`)
          const data = await response.json()
          
          return {
            tradeId,
            count: response.ok ? data.count : 0,
            isLiked: response.ok ? data.isLiked : false
          }
        } catch (error) {
          console.error(`Error fetching likes for trade ${tradeId}:`, error)
          return {
            tradeId,
            count: 0,
            isLiked: false
          }
        }
      })
      
      const likesResults = await Promise.all(likesPromises)
      
      // Actualizar estado con todos los likes
      const newLikesData: {[tradeId: string]: LikeData} = {}
      likesResults.forEach(({ tradeId, count, isLiked }) => {
        newLikesData[tradeId] = { count, isLiked }
      })
      
      setLikesData(prev => ({ ...prev, ...newLikesData }))
      
    } catch (error) {
      console.error('Error loading likes batch:', error)
    }
  }

  // Función simplificada para cargar likes individuales (solo para nuevos trades)
  const loadLikes = async (tradeId: string) => {
    try {
      const response = await fetch(`/api/likes?trade_id=${tradeId}`)
      const data = await response.json()
      
      if (response.ok) {
        setLikesData(prev => ({
          ...prev,
          [tradeId]: {
            count: data.count,
            isLiked: data.isLiked
          }
        }))
      } else {
        console.error('Error fetching likes:', data)
        setLikesData(prev => ({
          ...prev,
          [tradeId]: {
            count: 0,
            isLiked: false
          }
        }))
      }
    } catch (error) {
      console.error('Error fetching likes:', error)
      setLikesData(prev => ({
        ...prev,
        [tradeId]: {
          count: 0,
          isLiked: false
        }
      }))
    }
  }

  const toggleLike = async (tradeId: string) => {
    if (loadingLike[tradeId]) return
    
    setLoadingLike(prev => ({ ...prev, [tradeId]: true }))
    
    try {
      const currentLike = likesData[tradeId] || { count: 0, isLiked: false }
      const method = currentLike.isLiked ? 'DELETE' : 'POST'
      
      // Actualización optimista
      setLikesData(prev => ({
        ...prev,
        [tradeId]: {
          count: currentLike.isLiked ? (currentLike.count - 1) : (currentLike.count + 1),
          isLiked: !currentLike.isLiked
        }
      }))
      
      const response = await fetch('/api/likes', {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ trade_id: tradeId })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        console.error('API Error:', errorData)
        
        // Revertir en caso de error
        setLikesData(prev => ({
          ...prev,
          [tradeId]: currentLike
        }))
        
        // Don't throw error, just log it
        console.error('Error toggling like:', errorData.error || 'Unknown error')
        return
      }
      
      // Recargar likes para asegurar consistencia
      loadLikes(tradeId)
      
    } catch (error) {
      console.error('Error toggling like:', error)
      // Ensure we revert to a safe state
      setLikesData(prev => ({
        ...prev,
        [tradeId]: prev[tradeId] || { count: 0, isLiked: false }
      }))
    } finally {
      setLoadingLike(prev => ({ ...prev, [tradeId]: false }))
    }
  }

  const loadMore = async () => {
    const nextPage = page + 1
    setPage(nextPage)
    await loadTrades(nextPage)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 24) {
      return `${diffInHours}h`
    } else {
      return `${Math.floor(diffInHours / 24)}d`
    }
  }

  const getResultColor = (result: string) => {
    switch (result) {
      case 'win': return 'text-green-400'
      case 'loss': return 'text-red-400'
      case 'be': return 'text-yellow-400'
      default: return 'text-gray-400'
    }
  }

  const getResultIcon = (result: string) => {
    switch (result) {
      case 'win': return <TrendingUp className="w-4 h-4" />
      case 'loss': return <TrendingDown className="w-4 h-4" />
      case 'be': return <Minus className="w-4 h-4" />
      default: return <Clock className="w-4 h-4" />
    }
  }

  const getBiasColor = (bias: string) => {
    return bias === 'alcista' ? 'text-green-400' : 'text-red-400'
  }

  const openTradeModal = (trade: PublicTrade) => {
    setSelectedTrade(trade)
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setSelectedTrade(null)
  }

  useEffect(() => {
    if (user) {
      loadTrades()
    }
  }, [user])

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <LoadingSpinner size={100} />
        </div>
      </Layout>
    )
  }

  if (!user) {
    return null
  }

  return (
    <Layout>
      <div className="pb-20 md:pb-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Feed</h1>
            <p className="text-gray-400">Descubre trades compartidos por la comunidad</p>
          </div>

          {/* Lista de trades */}
          <div className="space-y-6">
            {trades.map((trade) => {
              // Get safe display name for each trade
              const displayName = getSafeDisplayName(trade.username)
              const userInitials = getUserInitials(trade.username)
              
              return (
                <div 
                  key={trade.id} 
                  onClick={() => openTradeModal(trade)}
                  className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition-colors cursor-pointer"
                >
                  {/* Header del trade */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                        {trade.avatar_url ? (
                          <img src={trade.avatar_url} alt={displayName} className="w-full h-full rounded-full object-cover" />
                        ) : (
                          <span className="text-white font-bold text-sm">{userInitials}</span>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center space-x-1">
                          <h3 className="text-white font-medium">{displayName}</h3>
                          {(trade.is_premium || true) && (
                            <BadgeCheck className="w-5 h-5 text-blue-400 drop-shadow-sm" />
                          )}
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-gray-400">
                          <Clock className="w-3 h-3" />
                          <span>{formatDate(trade.created_at)}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4 text-sm">
                      <div className="text-center">
                        <div className="text-green-400 font-bold">{trade.wins}</div>
                        <div className="text-gray-400">Wins</div>
                      </div>
                      <div className="text-center">
                        <div className="text-red-400 font-bold">{trade.losses}</div>
                        <div className="text-gray-400">Losses</div>
                      </div>
                      <div className="text-center">
                        <div className="text-blue-400 font-bold">{trade.win_rate}%</div>
                        <div className="text-gray-400">WR</div>
                      </div>
                    </div>
                  </div>

                  {/* Título del trade */}
                  <h2 className="text-xl font-semibold text-white mb-4">{trade.title}</h2>

                  {/* Información del trade */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="bg-gray-800/50 rounded-lg p-3">
                      <div className="text-gray-400 text-sm">Par</div>
                      <div className="text-white font-medium">{trade.pair}</div>
                    </div>
                    <div className="bg-gray-800/50 rounded-lg p-3">
                      <div className="text-gray-400 text-sm">Timeframe</div>
                      <div className="text-white font-medium">{trade.timeframe}</div>
                    </div>
                    <div className="bg-gray-800/50 rounded-lg p-3">
                      <div className="text-gray-400 text-sm">Bias</div>
                      <div className={`font-medium ${getBiasColor(trade.bias)}`}>
                        {trade.bias === 'alcista' ? '📈 Alcista' : '📉 Bajista'}
                      </div>
                    </div>
                    <div className="bg-gray-800/50 rounded-lg p-3">
                      <div className="text-gray-400 text-sm">R:R</div>
                      <div className="text-white font-medium">{trade.risk_reward}</div>
                    </div>
                  </div>

                  {/* Resultado */}
                  <div className="flex items-center justify-between mb-4">
                    <div className={`flex items-center space-x-2 ${getResultColor(trade.result)}`}>
                      {getResultIcon(trade.result)}
                      <span className="font-medium text-lg capitalize">{trade.result}</span>
                    </div>
                    
                    <div className="flex items-center space-x-4 text-sm">
                      {trade.pnl_percentage && (
                        <div className="text-center">
                          <div className={`font-bold ${trade.pnl_percentage >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {trade.pnl_percentage >= 0 ? '+' : ''}{trade.pnl_percentage.toFixed(2)}%
                          </div>
                          <div className="text-gray-400">Porcentaje</div>
                        </div>
                      )}
                      {trade.pnl_pips && (
                        <div className="text-center">
                          <div className={`font-bold ${trade.pnl_pips >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {trade.pnl_pips >= 0 ? '+' : ''}{trade.pnl_pips.toFixed(1)}
                          </div>
                          <div className="text-gray-400">Pips</div>
                        </div>
                      )}
                      {trade.pnl_money && (
                        <div className="text-center">
                          <div className={`font-bold ${trade.pnl_money >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {trade.pnl_money >= 0 ? '+' : ''}${Math.abs(trade.pnl_money).toFixed(2)}
                          </div>
                          <div className="text-gray-400">Dinero</div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Screenshot */}
                  {trade.screenshot_url && (
                    <div className="mb-4">
                      <img
                        src={trade.screenshot_url}
                        alt="Trade Screenshot"
                        className="w-full max-h-96 object-contain rounded-lg bg-gray-800"
                      />
                    </div>
                  )}

                  {/* Botones de likes */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-700">
                    <div className="flex items-center space-x-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleLike(trade.id)
                        }}
                        className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                          likesData[trade.id]?.isLiked 
                            ? 'bg-red-600/20 text-red-400 hover:bg-red-600/30' 
                            : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50 hover:text-red-400'
                        }`}
                      >
                        <Heart className={`w-4 h-4 ${likesData[trade.id]?.isLiked ? 'fill-current' : ''}`} />
                        <span className="text-sm font-medium">
                          {likesData[trade.id]?.count || 0}
                        </span>
                      </button>
                    </div>
                    
                    <div className="text-xs text-gray-500">
                      {formatDate(trade.created_at)}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Botón cargar más */}
          {hasMore && (
            <div className="text-center mt-8">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-medium py-3 px-6 rounded-lg transition-colors"
              >
                {loadingMore ? 'Cargando...' : 'Cargar más trades'}
              </button>
            </div>
          )}

          {/* Mensaje si no hay más trades */}
          {!hasMore && trades.length > 0 && (
            <div className="text-center mt-8 text-gray-400">
              No hay más trades para mostrar
            </div>
          )}

          {/* Mensaje si no hay trades */}
          {trades.length === 0 && !loading && (
            <div className="text-center mt-8">
              <div className="text-gray-400 mb-4">
                <BarChart3 className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>No hay trades públicos aún</p>
                <p className="text-sm mt-2">¡Sé el primero en compartir un trade!</p>
              </div>
              <Link
                href="/"
                className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
              >
                Crear Trade
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Modal de detalle del trade */}
      {showModal && selectedTrade && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header del modal */}
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                  {selectedTrade.avatar_url ? (
                    <img src={selectedTrade.avatar_url} alt={getSafeDisplayName(selectedTrade.username)} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <span className="text-white font-bold text-sm">{getUserInitials(selectedTrade.username)}</span>
                  )}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">{selectedTrade.title}</h2>
                  <div className="flex items-center space-x-1 text-gray-400 text-sm">
                    <span>por {getSafeDisplayName(selectedTrade.username)}</span>
                    {selectedTrade.is_premium && (
                      <BadgeCheck className="w-5 h-5 text-blue-400 drop-shadow-sm" />
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
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
                    <div className={`font-medium ${getBiasColor(selectedTrade.bias)}`}>
                      {selectedTrade.bias === 'alcista' ? 'Alcista' : 'Bajista'}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-400 text-sm">Resultado:</span>
                    <div className={`font-medium ${getResultColor(selectedTrade.result)}`}>
                      {selectedTrade.result === 'win' ? 'Win' : 
                       selectedTrade.result === 'loss' ? 'Loss' : 
                       selectedTrade.result === 'be' ? 'Break Even' : selectedTrade.result}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-400 text-sm">Risk:Reward:</span>
                    <div className="text-white font-medium">{selectedTrade.risk_reward}</div>
                  </div>
                </div>
              </div>
              
              {/* Estadísticas del trader */}
              <div className="bg-gray-900/50 rounded-lg p-4">
                <h3 className="text-gray-400 text-sm mb-3">Estadísticas del Trader</h3>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-xl font-bold text-green-400">{selectedTrade.wins}</div>
                    <div className="text-gray-500 text-xs">Wins</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-red-400">{selectedTrade.losses}</div>
                    <div className="text-gray-500 text-xs">Losses</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-blue-400">{selectedTrade.win_rate}%</div>
                    <div className="text-gray-500 text-xs">Win Rate</div>
                  </div>
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
                Publicado el {formatDate(selectedTrade.created_at)}
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
} 