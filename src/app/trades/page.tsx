'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Trophy } from 'lucide-react'
import Layout from '@/components/Layout'
import LoadingSpinner from '@/components/LoadingSpinner'

interface Trade {
  id: string
  title: string
  pair: string
  timeframe: string
  result: string
  risk_reward: string
  created_at: string
  bias: string
  feeling: number
  description: string
  confluences: string | null
  pnl_percentage: number | null
  pnl_pips: number | null
  pnl_money: number | null
  screenshot_url: string | null
  session: string
}

export default function TradesPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [trades, setTrades] = useState<Trade[]>([])
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [isPremium, setIsPremium] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deletingTrade, setDeletingTrade] = useState(false)
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)
  
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUser(user)
      await loadUserData(user.id)
      await loadTrades(user.id)
      setLoading(false)
    }

    getUser()
  }, [router, supabase.auth])

  const loadUserData = async (userId: string) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('is_premium')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Error loading user profile:', error)
        return
      }

      const premiumStatus = profile?.is_premium || false
      setIsPremium(premiumStatus)
    } catch (err) {
      console.error('Error loading user data:', err)
    }
  }

  const loadTrades = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading trades:', error)
        return
      }

      setTrades(data || [])
    } catch (err) {
      console.error('Error:', err)
    }
  }

  const deleteTrade = async () => {
    if (!selectedTrade) {
      return
    }

    if (!user?.id) {
      alert('Error: Usuario no autenticado')
      return
    }

    setDeletingTrade(true)
    try {
      // Usar API route segura para eliminar trade
      const response = await fetch(`/api/trades/${selectedTrade.id}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (!response.ok) {
        // Manejar errores específicos del servidor
        if (result.premium_required) {
          alert(`🔒 ${result.message}\n\nActualiza a Premium para eliminar trades.`)
        } else {
          alert(`Error: ${result.error}`)
        }
        return
      }

      // Actualizar la lista local
      const updatedTrades = trades.filter(trade => trade.id !== selectedTrade.id)
      setTrades(updatedTrades)
      
      // Cerrar modales
      setShowDeleteConfirm(false)
      setShowModal(false)
      setSelectedTrade(null)
      
      alert('✅ Trade eliminado exitosamente')
    } catch (err) {
      console.error('Error:', err)
      alert('Error de conexión. Por favor verifica tu internet e inténtalo de nuevo.')
    } finally {
      setDeletingTrade(false)
    }
  }

  const bulkDeleteTrades = async () => {
    if (!user?.id) {
      alert('Error: Usuario no autenticado')
      return
    }

    setBulkDeleting(true)
    try {
      // Usar API route segura para eliminar todos los trades
      const response = await fetch('/api/trades/bulk-delete', {
        method: 'DELETE',
      })

      const result = await response.json()

      if (!response.ok) {
        // Manejar errores específicos del servidor
        if (result.premium_required) {
          alert(`🔒 ${result.message}\n\nEsta función avanzada está disponible solo para usuarios Premium.`)
        } else {
          alert(`Error: ${result.error}`)
        }
        return
      }

      // Limpiar la lista local
      setTrades([])
      
      // Cerrar modal
      setShowBulkDeleteConfirm(false)
      
      alert(`✅ ${result.message}\n${result.deleted_count} trades eliminados.`)
    } catch (err) {
      console.error('Error:', err)
      alert('Error de conexión. Por favor verifica tu internet e inténtalo de nuevo.')
    } finally {
      setBulkDeleting(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const openTradeModal = (trade: Trade) => {
    setSelectedTrade(trade)
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setSelectedTrade(null)
    setShowDeleteConfirm(false)
  }

  const openDeleteConfirm = () => {
    setShowDeleteConfirm(true)
  }

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
      <div className="p-6">
        {/* Título principal */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl md:text-2xl font-bold text-white">
            Mis Trades
          </h1>
          
          {/* Botón de eliminar todos - Solo si hay trades */}
          {trades && trades.length > 0 && (
            <button
              onClick={() => setShowBulkDeleteConfirm(true)}
              className="bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
              title="Eliminar todos los trades (Premium)"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span>Eliminar Todos</span>
            </button>
          )}
        </div>

        {/* Lista de trades - DISEÑO VERTICAL */}
        <div className="space-y-4">
          {trades && trades.length > 0 ? (
            trades.map((trade) => (
              <div 
                key={trade.id} 
                className="bg-gray-800/60 backdrop-blur-sm rounded-lg p-4 border border-gray-700 hover:bg-gray-800/80 transition-all duration-200 hover:border-gray-600 relative"
              >
                {/* Botón de eliminar en la esquina superior derecha */}
                <button
                  onClick={(e) => {
                    e.stopPropagation() // Evitar que se abra el modal de detalles
                    setSelectedTrade(trade)
                    setShowDeleteConfirm(true)
                  }}
                  className="absolute top-2 right-2 w-6 h-6 bg-red-600/80 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-sm font-bold transition-colors z-10"
                  title="Eliminar trade"
                >
                  ×
                </button>

                <div 
                  onClick={() => openTradeModal(trade)}
                  className="cursor-pointer"
                >
                  <div className="flex items-center space-x-4">
                    {/* Imagen del trade - Más pequeña como preview */}
                    {trade.screenshot_url && (
                      <div className="flex-shrink-0">
                        <img
                          src={trade.screenshot_url}
                          alt={`Screenshot de ${trade.title}`}
                          className="w-16 h-16 object-cover rounded-lg"
                        />
                      </div>
                    )}
                    
                    {/* Información principal */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-white font-semibold text-lg truncate">{trade.title}</h3>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            trade.result === 'win' 
                              ? 'bg-green-600/20 text-green-400'
                              : trade.result === 'loss'
                                ? 'bg-red-600/20 text-red-400'
                                : 'bg-yellow-600/20 text-yellow-400'
                          }`}>
                            {trade.result === 'win' ? 'Win' : trade.result === 'loss' ? 'Loss' : 'BE'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 text-sm text-gray-300">
                          <span>{trade.pair}</span>
                          <span className="text-gray-500">•</span>
                          <span>{trade.timeframe}</span>
                        </div>
                        
                        {/* P&L destacado */}
                        {(trade.pnl_percentage || trade.pnl_pips || trade.pnl_money) && (
                          <div className={`text-sm font-semibold ${
                            (trade.pnl_percentage || trade.pnl_pips || trade.pnl_money || 0) > 0 ? 'text-green-400' : 
                            (trade.pnl_percentage || trade.pnl_pips || trade.pnl_money || 0) < 0 ? 'text-red-400' : 'text-gray-400'
                          }`}>
                            {trade.pnl_percentage && (
                              <span>{trade.pnl_percentage > 0 ? '+' : ''}{trade.pnl_percentage.toFixed(2)}%</span>
                            )}
                            {trade.pnl_pips && !trade.pnl_percentage && (
                              <span>{trade.pnl_pips > 0 ? '+' : ''}{trade.pnl_pips.toFixed(1)} pips</span>
                            )}
                            {trade.pnl_money && !trade.pnl_percentage && !trade.pnl_pips && (
                              <span>{trade.pnl_money > 0 ? '+' : ''}${trade.pnl_money.toFixed(2)}</span>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {/* Sentimiento y fecha */}
                      <div className="flex items-center justify-between mt-2">
                        {trade.feeling && (
                          <div className="flex items-center space-x-1">
                            <span className="text-xs text-gray-400">Sentimiento:</span>
                            <span className="text-xs text-white">{trade.feeling}%</span>
                            <span className="text-sm">
                              {trade.feeling <= 30 ? '😞' : 
                               trade.feeling <= 70 ? '🤔' : '😊'}
                            </span>
                          </div>
                        )}
                        <span className="text-xs text-gray-500">
                          {new Date(trade.created_at).toLocaleDateString('es-ES')}
                        </span>
                      </div>
                    </div>
                    
                    {/* Flecha para indicar que es clickeable */}
                    <div className="flex-shrink-0">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📊</div>
              <h3 className="text-white text-lg font-medium mb-2">
                No tienes trades registrados
              </h3>
              <p className="text-gray-400 mb-6">
                Comienza registrando tu primer trade para hacer seguimiento de tu progreso
              </p>
              <Link
                href="/"
                className="inline-block bg-white text-black font-semibold py-3 px-6 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Registrar Primer Trade
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
              <h2 className="text-xl font-bold text-white">{selectedTrade.title}</h2>
              <div className="flex items-center space-x-3">
                {/* Botón de cerrar */}
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            {/* Contenido del modal */}
            <div className="p-6 space-y-6">
              {/* Imagen grande */}
              {selectedTrade.screenshot_url && (
                <div>
                  <img
                    src={selectedTrade.screenshot_url}
                    alt={`Screenshot de ${selectedTrade.title}`}
                    className="w-full rounded-lg"
                  />
                </div>
              )}
              
              {/* Información detallada */}
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
                  <div>
                    <span className="text-gray-400 text-sm">Sesión:</span>
                    <div className="text-white font-medium">
                      {selectedTrade.session === 'asian' ? 'Asiática' : 
                       selectedTrade.session === 'london' ? 'Londres' : 
                       selectedTrade.session === 'newyork' ? 'Nueva York' : 
                       'Solapamiento'}
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <span className="text-gray-400 text-sm">Bias:</span>
                    <div className={`font-medium ${
                      selectedTrade.bias === 'alcista' ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {selectedTrade.bias === 'alcista' ? 'Alcista' : 'Bajista'}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-400 text-sm">Resultado:</span>
                    <div className={`font-medium ${
                      selectedTrade.result === 'win' ? 'text-green-400' : 
                      selectedTrade.result === 'loss' ? 'text-red-400' : 'text-yellow-400'
                    }`}>
                      {selectedTrade.result === 'win' ? 'Win' : 
                       selectedTrade.result === 'loss' ? 'Loss' : 'Break Even'}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-400 text-sm">Risk:Reward:</span>
                    <div className="text-white font-medium">{selectedTrade.risk_reward}</div>
                  </div>
                </div>
              </div>
              
              {/* P&L detallado */}
              {(selectedTrade.pnl_percentage || selectedTrade.pnl_pips || selectedTrade.pnl_money) && (
                <div className="bg-gray-900/50 rounded-lg p-4">
                  <h3 className="text-gray-400 text-sm mb-3">Resultado Financiero</h3>
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
                    {selectedTrade.pnl_money && (
                      <div>
                        <div className={`text-xl font-bold ${
                          selectedTrade.pnl_money > 0 ? 'text-green-400' : 
                          selectedTrade.pnl_money < 0 ? 'text-red-400' : 'text-gray-400'
                        }`}>
                          {selectedTrade.pnl_money > 0 ? '+' : ''}${selectedTrade.pnl_money.toFixed(2)}
                        </div>
                        <div className="text-gray-500 text-xs">Dinero</div>
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
                Registrado el {new Date(selectedTrade.created_at).toLocaleDateString('es-ES', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación de eliminación */}
      {showDeleteConfirm && selectedTrade && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-60 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-lg max-w-md w-full border border-red-500/30">
            {/* Header del modal de confirmación */}
            <div className="p-6 border-b border-gray-700">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-red-900/30 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 15.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Eliminar Trade</h3>
                  <p className="text-sm text-gray-400">Esta acción no se puede deshacer</p>
                </div>
              </div>
            </div>
            
            {/* Contenido del modal de confirmación */}
            <div className="p-6">
              <p className="text-gray-300 mb-4">
                ¿Estás seguro de que quieres eliminar el trade <span className="font-semibold text-white">"{selectedTrade.title}"</span>?
              </p>
              
              <div className="bg-gray-900/50 rounded-lg p-3 mb-4">
                <div className="text-sm text-gray-400 space-y-1">
                  <div>• Se eliminará permanentemente de tu historial</div>
                  <div>• Se recalcularán automáticamente tus estadísticas</div>
                  <div>• No podrás recuperar esta información</div>
                </div>
              </div>

              {!isPremium && (
                <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-3 mb-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-xl">⭐</span>
                    <div className="text-sm">
                      <div className="text-yellow-400 font-medium">Función Premium</div>
                      <div className="text-yellow-300/80">Actualiza a Premium para eliminar trades</div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Botones de acción */}
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors"
                  disabled={deletingTrade}
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    deleteTrade()
                  }}
                  disabled={deletingTrade}
                  className={`flex-1 py-2 px-4 rounded-lg transition-colors font-medium ${
                    !deletingTrade
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {deletingTrade ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Eliminando...</span>
                    </div>
                  ) : (
                    'Eliminar Trade'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación para eliminar todos los trades */}
      {showBulkDeleteConfirm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-60 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-lg max-w-md w-full border border-red-500/30">
            {/* Header del modal de confirmación */}
            <div className="p-6 border-b border-gray-700">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-red-900/30 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 15.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Eliminar Todos los Trades</h3>
                  <p className="text-sm text-gray-400">⚠️ Esta acción es IRREVERSIBLE</p>
                </div>
              </div>
            </div>
            
            {/* Contenido del modal de confirmación */}
            <div className="p-6">
              <p className="text-gray-300 mb-4">
                ¿Estás seguro de que quieres eliminar <span className="font-semibold text-white">TODOS tus trades</span>?
              </p>
              
              <div className="bg-red-900/20 rounded-lg p-3 mb-4 border border-red-500/30">
                <div className="text-sm text-red-300 space-y-1 font-medium">
                  <div>⚠️ Se eliminarán {trades.length} trades permanentemente</div>
                  <div>⚠️ Se borrarán todas tus estadísticas</div>
                  <div>⚠️ No podrás recuperar esta información</div>
                  <div>⚠️ Esta acción no se puede deshacer</div>
                </div>
              </div>

              <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-3 mb-4">
                <div className="flex items-center space-x-2">
                  <span className="text-xl">⭐</span>
                  <div className="text-sm">
                    <div className="text-yellow-400 font-medium">Función Premium Avanzada</div>
                    <div className="text-yellow-300/80">Solo usuarios Premium pueden eliminar todos los trades</div>
                  </div>
                </div>
              </div>
              
              {/* Botones de acción */}
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowBulkDeleteConfirm(false)}
                  className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors"
                  disabled={bulkDeleting}
                >
                  Cancelar
                </button>
                <button
                  onClick={bulkDeleteTrades}
                  disabled={bulkDeleting}
                  className={`flex-1 py-2 px-4 rounded-lg transition-colors font-medium ${
                    !bulkDeleting
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {bulkDeleting ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Eliminando...</span>
                    </div>
                  ) : (
                    'Eliminar Todos'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
} 