'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Trophy, TrendingUp, TrendingDown, Minus, Clock, User, BarChart3, Heart, BadgeCheck } from 'lucide-react'
import { getSafeDisplayName, getUserInitials } from '@/utils/userUtils'
import Layout from '@/components/Layout'
import LoadingSpinner from '@/components/LoadingSpinner'
import { useOptimizedUserData, useOptimizedFeed } from '@/hooks/useOptimizedData'

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
  user_liked: boolean
}

interface LikeData {
  count: number
  isLiked: boolean
}

export default function FeedPage() {
  const [showModal, setShowModal] = useState(false)
  const [selectedTrade, setSelectedTrade] = useState<PublicTrade | null>(null)
  const [likesData, setLikesData] = useState<{[tradeId: string]: LikeData}>({})
  const [loadingLike, setLoadingLike] = useState<{[tradeId: string]: boolean}>({})
  const router = useRouter()
  const supabase = createClient()

  // Usar hooks optimizados
  const { user, loading: userLoading } = useOptimizedUserData()
  const { trades, loading: tradesLoading, error, hasMore, refetch, loadMore } = useOptimizedFeed(1, 20)

  // Redirigir si no hay usuario
  React.useEffect(() => {
    if (!userLoading && !user) {
      router.push('/auth/login')
    }
  }, [user, userLoading, router])

  // Sincronizar likes data cuando cambien los trades
  React.useEffect(() => {
    if (trades.length > 0) {
      const newLikesData: {[tradeId: string]: LikeData} = {}
      trades.forEach((trade: PublicTrade) => {
        newLikesData[trade.id] = {
          count: trade.likes_count,
          isLiked: trade.user_liked
        }
      })
      setLikesData(newLikesData)
    }
  }, [trades])

  const toggleLike = useCallback(async (tradeId: string) => {
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
        
        console.error('Error toggling like:', errorData.error || 'Unknown error')
        return
      }
      
      // Recargar datos después de un cambio exitoso
      await refetch()
      
    } catch (error) {
      console.error('Error toggling like:', error)
      // Revertir a estado seguro
      setLikesData(prev => ({
        ...prev,
        [tradeId]: prev[tradeId] || { count: 0, isLiked: false }
      }))
    } finally {
      setLoadingLike(prev => ({ ...prev, [tradeId]: false }))
    }
  }, [likesData, loadingLike, refetch])

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }, [supabase, router])

  // Memoizar funciones de utilidad
  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'Hace menos de 1 hora'
    if (diffInHours < 24) return `Hace ${diffInHours} horas`
    if (diffInHours < 48) return 'Hace 1 día'
    
    const diffInDays = Math.floor(diffInHours / 24)
    return `Hace ${diffInDays} días`
  }, [])

  const getResultColor = useCallback((result: string) => {
    switch (result) {
      case 'win': return 'text-green-400'
      case 'loss': return 'text-red-400'
      default: return 'text-yellow-400'
    }
  }, [])

  const getResultIcon = useCallback((result: string) => {
    switch (result) {
      case 'win': return <TrendingUp className="w-4 h-4" />
      case 'loss': return <TrendingDown className="w-4 h-4" />
      default: return <Minus className="w-4 h-4" />
    }
  }, [])

  const getBiasColor = useCallback((bias: string) => {
    return bias === 'alcista' ? 'text-green-400' : 'text-red-400'
  }, [])

  const openTradeModal = useCallback((trade: PublicTrade) => {
    setSelectedTrade(trade)
    setShowModal(true)
  }, [])

  const closeModal = useCallback(() => {
    setShowModal(false)
    setSelectedTrade(null)
  }, [])

  // Memoizar la lista de trades para evitar re-renders
  const tradesList = useMemo(() => {
    return trades.map((trade) => {
      const likeData = likesData[trade.id] || { count: trade.likes_count, isLiked: trade.user_liked }
      
      return (
        <div key={trade.id} className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-gray-600 transition-colors">
          {/* Trade content */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
                {trade.avatar_url ? (
                  <Image
                    src={trade.avatar_url}
                    alt={getSafeDisplayName(trade.username)}
                    width={40}
                    height={40}
                    className="rounded-full"
                  />
                ) : (
                  <span className="text-white font-medium text-sm">
                    {getUserInitials(trade.username)}
                  </span>
                )}
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-white font-medium">
                    {getSafeDisplayName(trade.username)}
                  </span>
                  {trade.is_premium && (
                    <BadgeCheck className="w-4 h-4 text-blue-400" />
                  )}
                </div>
                <div className="flex items-center space-x-2 text-gray-400 text-sm">
                  <Clock className="w-3 h-3" />
                  <span>{formatDate(trade.created_at)}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => toggleLike(trade.id)}
                disabled={loadingLike[trade.id]}
                className={`flex items-center space-x-1 px-3 py-1 rounded-full text-sm transition-colors ${
                  likeData.isLiked 
                    ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' 
                    : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                }`}
              >
                <Heart className={`w-4 h-4 ${likeData.isLiked ? 'fill-current' : ''}`} />
                <span>{likeData.count}</span>
              </button>
            </div>
          </div>

          {/* Trade details */}
          <div className="space-y-3">
            <h3 className="text-white font-semibold text-lg">{trade.title}</h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <span className="text-gray-400 text-sm">Par</span>
                <div className="text-white font-medium">{trade.pair}</div>
              </div>
              <div>
                <span className="text-gray-400 text-sm">Timeframe</span>
                <div className="text-white font-medium">{trade.timeframe}</div>
              </div>
              <div>
                <span className="text-gray-400 text-sm">Bias</span>
                <div className={`font-medium ${getBiasColor(trade.bias)}`}>
                  {trade.bias === 'alcista' ? 'Alcista' : 'Bajista'}
                </div>
              </div>
              <div>
                <span className="text-gray-400 text-sm">Resultado</span>
                <div className={`flex items-center space-x-1 font-medium ${getResultColor(trade.result)}`}>
                  {getResultIcon(trade.result)}
                  <span>{trade.result === 'win' ? 'Win' : trade.result === 'loss' ? 'Loss' : 'Break Even'}</span>
                </div>
              </div>
            </div>

            {/* P&L */}
            <div className="grid grid-cols-3 gap-4 pt-3 border-t border-gray-700">
              <div>
                <span className="text-gray-400 text-sm">P&L %</span>
                <div className={`font-bold ${getResultColor(trade.result)}`}>
                  {(trade.pnl_percentage || 0) > 0 ? '+' : ''}{(trade.pnl_percentage || 0).toFixed(2)}%
                </div>
              </div>
              <div>
                <span className="text-gray-400 text-sm">P&L Pips</span>
                <div className={`font-bold ${getResultColor(trade.result)}`}>
                  {(trade.pnl_pips || 0) > 0 ? '+' : ''}{trade.pnl_pips || 0}
                </div>
              </div>
              <div>
                <span className="text-gray-400 text-sm">P&L $</span>
                <div className={`font-bold ${getResultColor(trade.result)}`}>
                  {(trade.pnl_money || 0) > 0 ? '+' : ''}${(trade.pnl_money || 0).toFixed(2)}
                </div>
              </div>
            </div>

            {/* Screenshot */}
            {trade.screenshot_url && (
              <div className="mt-4">
                <Image
                  src={trade.screenshot_url}
                  alt="Trade Screenshot"
                  width={600}
                  height={400}
                  className="rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => openTradeModal(trade)}
                />
              </div>
            )}

            {/* Trader Stats */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-700">
              <div className="flex items-center space-x-4 text-sm">
                <div className="flex items-center space-x-1">
                  <Trophy className="w-4 h-4 text-yellow-400" />
                  <span className="text-gray-400">Wins:</span>
                  <span className="text-green-400 font-medium">{trade.wins}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="text-gray-400">Losses:</span>
                  <span className="text-red-400 font-medium">{trade.losses}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="text-gray-400">WR:</span>
                  <span className="text-blue-400 font-medium">{(trade.win_rate || 0).toFixed(1)}%</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-400">Total P&L</div>
                <div className={`font-bold ${(trade.total_pnl_percentage || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {(trade.total_pnl_percentage || 0) >= 0 ? '+' : ''}{(trade.total_pnl_percentage || 0).toFixed(2)}%
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    })
  }, [trades, likesData, loadingLike, formatDate, getResultColor, getResultIcon, getBiasColor, openTradeModal, toggleLike])

  // Mostrar loading si están cargando los datos del usuario o los trades
  if (userLoading || tradesLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: '#010314'}}>
          <LoadingSpinner 
            size={120} 
            className="text-white"
          />
        </div>
      </Layout>
    )
  }

  // Mostrar error si hay problemas cargando
  if (error) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: '#010314'}}>
          <div className="text-center">
            <div className="text-red-400 text-lg mb-4">Error cargando el feed</div>
            <button
              onClick={refetch}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Reintentar
            </button>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="min-h-screen p-4 md:p-6" style={{backgroundColor: '#010314'}}>
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
            Feed de Trading
          </h1>
          <p className="text-gray-400">
            Descubre los trades públicos de la comunidad
          </p>
        </div>

        {/* Trades List */}
        <div className="space-y-6">
          {tradesList}
        </div>

        {/* Load More Button */}
        {hasMore && (
          <div className="flex justify-center mt-8">
            <button
              onClick={loadMore}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Cargar más trades
            </button>
          </div>
        )}

        {/* Empty State */}
        {trades.length === 0 && !tradesLoading && (
          <div className="text-center py-12">
            <TrendingUp className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No hay trades públicos</h3>
            <p className="text-gray-400 mb-6">
              Sé el primero en compartir un trade público con la comunidad
            </p>
            <Link
              href="/"
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <BarChart3 className="w-5 h-5 mr-2" />
              Crear Trade
            </Link>
          </div>
        )}
      </div>

      {/* Modal para ver trade completo */}
      {showModal && selectedTrade && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto" style={{backgroundColor: '#010314', border: '1px solid #374151'}}>
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-bold text-white">{selectedTrade.title}</h2>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {selectedTrade.screenshot_url && (
                <div className="mb-6">
                  <Image
                    src={selectedTrade.screenshot_url}
                    alt="Trade Screenshot"
                    width={800}
                    height={600}
                    className="rounded-lg w-full"
                  />
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <span className="text-gray-400 text-sm">Par de divisas</span>
                    <div className="text-white font-medium text-lg">{selectedTrade.pair}</div>
                  </div>
                  <div>
                    <span className="text-gray-400 text-sm">Timeframe</span>
                    <div className="text-white font-medium">{selectedTrade.timeframe}</div>
                  </div>
                  <div>
                    <span className="text-gray-400 text-sm">Bias</span>
                    <div className={`font-medium ${getBiasColor(selectedTrade.bias)}`}>
                      {selectedTrade.bias === 'alcista' ? 'Alcista' : 'Bajista'}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-400 text-sm">Risk:Reward</span>
                    <div className="text-white font-medium">{selectedTrade.risk_reward}</div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <span className="text-gray-400 text-sm">Resultado</span>
                    <div className={`flex items-center space-x-2 font-medium ${getResultColor(selectedTrade.result)}`}>
                      {getResultIcon(selectedTrade.result)}
                      <span>{selectedTrade.result === 'win' ? 'Win' : selectedTrade.result === 'loss' ? 'Loss' : 'Break Even'}</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-400 text-sm">P&L Porcentaje</span>
                    <div className={`font-bold text-lg ${getResultColor(selectedTrade.result)}`}>
                      {(selectedTrade.pnl_percentage || 0) > 0 ? '+' : ''}{(selectedTrade.pnl_percentage || 0).toFixed(2)}%
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-400 text-sm">P&L en Pips</span>
                    <div className={`font-bold ${getResultColor(selectedTrade.result)}`}>
                      {(selectedTrade.pnl_pips || 0) > 0 ? '+' : ''}{selectedTrade.pnl_pips || 0}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-400 text-sm">P&L en Dinero</span>
                    <div className={`font-bold ${getResultColor(selectedTrade.result)}`}>
                      {(selectedTrade.pnl_money || 0) > 0 ? '+' : ''}${(selectedTrade.pnl_money || 0).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
              
              {selectedTrade.description && (
                <div className="mt-6">
                  <span className="text-gray-400 text-sm">Descripción</span>
                  <div className="text-white mt-2 p-4 bg-gray-700 rounded-lg">
                    {selectedTrade.description}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
} 