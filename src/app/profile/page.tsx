'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import TradeAdviceCard from '@/components/TradeAdviceCard'
import Layout from '@/components/Layout'
import { Trophy } from 'lucide-react'
import { getSafeDisplayName } from '@/utils/userUtils'

// Componente para el grid de actividad - Versión simplificada
const ActivityGrid = ({ trades }: { trades: any[] }) => {
  // Generar solo los últimos 90 días para que sea más limpio
  const generateDays = () => {
    const days = []
    const today = new Date()
    
    for (let i = 89; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      days.push(date)
    }
    
    return days
  }

  // Contar trades por fecha
  const getTradeCountForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    return trades.filter(trade => {
      const tradeDate = new Date(trade.created_at).toISOString().split('T')[0]
      return tradeDate === dateStr
    }).length
  }

  // Obtener intensidad de color basada en la cantidad de trades
  const getIntensity = (count: number) => {
    if (count === 0) return 'bg-gray-800'
    if (count === 1) return 'bg-green-900'
    if (count === 2) return 'bg-green-700'
    if (count >= 3) return 'bg-green-500'
    return 'bg-green-300'
  }

  const days = generateDays()

  // Organizar días por semanas (13 semanas para 90 días)
  const weeks: (Date | null)[][] = []
  let currentWeek: (Date | null)[] = []
  
  days.forEach((day, index) => {
    if (index === 0) {
      // Llenar días vacíos al inicio de la primera semana
      for (let i = 0; i < day.getDay(); i++) {
        currentWeek.push(null)
      }
    }
    
    currentWeek.push(day)
    
    if (currentWeek.length === 7) {
      weeks.push(currentWeek)
      currentWeek = []
    }
  })
  
  // Agregar la última semana si no está completa
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push(null)
    }
    weeks.push(currentWeek)
  }

  return (
    <div className="bg-gray-800/60 backdrop-blur-sm rounded-lg p-6 border border-gray-700 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Actividad de Trading</h3>
        <div className="text-sm text-gray-400">
          Últimos 3 meses
        </div>
      </div>
      
      {/* Grid simplificado sin scroll */}
      <div className="w-full">
        {/* Grid de actividad */}
        <div className="flex w-full">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="flex flex-col flex-1 mr-1 last:mr-0">
              {week.map((day, dayIndex) => {
                if (!day) {
                  return <div key={dayIndex} className="w-full h-3 mb-1" />
                }
                
                const count = getTradeCountForDate(day)
                const intensity = getIntensity(count)
                
                return (
                  <div
                    key={dayIndex}
                    className={`w-full h-3 mb-1 rounded-sm ${intensity}`}
                    title={`${day.toLocaleDateString('es-ES')} - ${count} trade${count !== 1 ? 's' : ''}`}
                  />
                )
              })}
            </div>
          ))}
        </div>
        
        {/* Leyenda fija */}
        <div className="flex items-center justify-center mt-4 text-xs text-gray-400">
          <span className="mr-2">Menos</span>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-gray-800 rounded-sm"></div>
            <div className="w-3 h-3 bg-green-900 rounded-sm"></div>
            <div className="w-3 h-3 bg-green-700 rounded-sm"></div>
            <div className="w-3 h-3 bg-green-500 rounded-sm"></div>
          </div>
          <span className="ml-2">Más</span>
        </div>
      </div>
    </div>
  )
}

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [trades, setTrades] = useState<any[]>([])
  const [editingBalance, setEditingBalance] = useState(false)
  const [newBalance, setNewBalance] = useState('')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  
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
      setLoading(false)
    }

    getUser()
  }, [router, supabase.auth])

  const loadUserData = async (userId: string) => {
    try {
      console.log('🔍 Loading user data for:', userId)
      
      // Cargar todos los datos en paralelo para mejorar el rendimiento
      const loadStats = async () => {
        try {
          const result = await supabase
            .from('user_stats')
            .select('*')
            .eq('user_id', userId)
            .single()
          return { data: result.data, error: result.error, type: 'stats' }
        } catch (error) {
          return { data: null, error, type: 'stats' }
        }
      }
      
      const loadProfile = async () => {
        try {
          const result = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single()
          return { data: result.data, error: result.error, type: 'profile' }
        } catch (error) {
          return { data: null, error, type: 'profile' }
        }
      }
      
      const loadTrades = async () => {
        try {
          const result = await supabase
            .from('trades')
            .select('id, created_at, result, pnl_percentage')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(200) // Limitar a 200 trades más recientes para el grid
          return { data: result.data || [], error: result.error, type: 'trades' }
        } catch (error) {
          return { data: [], error, type: 'trades' }
        }
      }
      
      const [statsResult, profileResult, tradesResult] = await Promise.all([
        loadStats(),
        loadProfile(),
        loadTrades()
      ])

      // Procesar resultados
      if (statsResult.error && (statsResult.error as any)?.code !== 'PGRST116') {
        console.error('❌ Error loading stats:', statsResult.error)
      } else {
        setStats(statsResult.data)
      }
      
      if (profileResult.error) {
        console.error('❌ Error loading profile:', profileResult.error)
      } else {
        console.log('✅ Profile loaded successfully')
        setProfile(profileResult.data)
      }
      
      if (tradesResult.error) {
        console.error('❌ Error loading trades:', tradesResult.error)
      } else {
        console.log('✅ Trades loaded successfully:', tradesResult.data?.length || 0)
        setTrades(tradesResult.data || [])
      }
      
      setLastUpdated(new Date())
      
    } catch (error) {
      console.error('❌ Unexpected error loading user data:', error)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const updateAccountBalance = async () => {
    if (!user || !newBalance) {
      alert('Por favor ingresa un balance válido')
      return
    }

    try {
      const balance = parseFloat(newBalance)
      
      if (isNaN(balance)) {
        alert('Por favor ingresa un número válido')
        return
      }

      console.log('🔄 Updating balance to:', balance)

      const { data, error } = await supabase
        .from('profiles')
        .update({ account_balance: balance })
        .eq('id', user.id)
        .select()

      if (error) {
        console.error('❌ Error updating balance:', error)
        alert(`Error al actualizar el balance: ${error.message}`)
        return
      }

      console.log('✅ Balance updated successfully')
      
      // Recargar todos los datos del usuario para asegurar sincronización
      await loadUserData(user.id)
      
      setEditingBalance(false)
      setNewBalance('')
      
      alert('✅ Balance actualizado exitosamente')
    } catch (err) {
      console.error('💥 Error:', err)
      alert('Error inesperado al actualizar el balance')
    }
  }

  // Función para refrescar datos manualmente
  const refreshData = async () => {
    if (!user) return
    console.log('🔄 Refreshing user data...')
    await loadUserData(user.id)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: '#010314'}}>
        <Image
          src="/logo.jpeg"
          alt="TradeTrackr Logo"
          width={100}
          height={100}
          priority
          unoptimized
          className="animate-scale-cycle"
        />
      </div>
    )
  }

  if (!user) {
    return null
  }

  const totalTrades = stats?.total_trades || 0
  const isPremium = profile?.is_premium || false
  const freeTradesLeft = Math.max(0, 3 - totalTrades)
  const isTrialExpired = !isPremium && totalTrades >= 3

  return (
    <Layout>
      <div className="p-6">
        <div className="max-w-2xl mx-auto">
          {/* Título principal */}
          <div className="flex items-center justify-center mb-8">
            <h1 className="text-xl md:text-2xl font-bold text-white">
              Mi Perfil
            </h1>
            <button
              onClick={refreshData}
              className="ml-4 p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              title="Refrescar datos"
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>

          {/* Información del usuario */}
          <div className="bg-gray-800/60 backdrop-blur-sm rounded-lg p-6 border border-gray-700 mb-6">
            <div className="text-center">
              <div className="w-20 h-20 bg-gray-600 rounded-full mx-auto mb-4 flex items-center justify-center">
                <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h2 className="text-white font-semibold text-xl mb-2">
                {getSafeDisplayName(profile?.username || user?.email || 'Usuario')}
              </h2>
              
              {/* Estado Premium */}
              <div className="flex items-center justify-center space-x-2 mb-4">
                {isPremium ? (
                  <>
                    <span className="text-2xl">⭐</span>
                    <span className="text-yellow-400 font-bold text-lg">PREMIUM</span>
                  </>
                ) : (
                  <>
                    <span className="text-2xl">🆓</span>
                    <span className="text-gray-400 font-medium text-lg">GRATIS</span>
                  </>
                )}
              </div>

              {/* Balance de cuenta */}
              <div className="bg-gray-900/50 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <span className="text-2xl">💰</span>
                  <span className="text-gray-400 text-sm">Balance de Cuenta</span>
                </div>
                
                {/* Balance actual */}
                <div className="text-center mb-3">
                  <div className="text-2xl font-bold text-green-400 mb-1">
                    ${(profile?.account_balance || 1000).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-gray-400 text-xs">Balance Actual</div>
                  
                  {/* Debug info */}
                  {lastUpdated && (
                    <div className="text-gray-500 text-xs mt-2 bg-gray-800/30 p-2 rounded">
                      <div>Última actualización: {lastUpdated.toLocaleTimeString()}</div>
                      <div>Balance en memoria: ${profile?.account_balance || 'No cargado'}</div>
                    </div>
                  )}
                </div>

                {/* Mostrar P&L si hay trades */}
                {stats && stats.total_trades > 0 && (
                  <div className="bg-gray-800/50 rounded-lg p-3 mb-3">
                    <div className="flex justify-between items-center text-sm mb-2">
                      <span className="text-gray-400">P&L Total:</span>
                      <span className={`font-medium ${
                        (stats.total_pnl_money || 0) > 0 ? 'text-green-400' : 
                        (stats.total_pnl_money || 0) < 0 ? 'text-red-400' : 'text-gray-400'
                      }`}>
                        {stats.total_pnl_money ? `${stats.total_pnl_money > 0 ? '+' : ''}$${stats.total_pnl_money.toFixed(2)}` : '$0.00'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-400">P&L (%):</span>
                      <span className={`font-medium ${
                        (stats.total_pnl_percentage || 0) > 0 ? 'text-green-400' : 
                        (stats.total_pnl_percentage || 0) < 0 ? 'text-red-400' : 'text-gray-400'
                      }`}>
                        {stats.total_pnl_percentage ? `${stats.total_pnl_percentage > 0 ? '+' : ''}${stats.total_pnl_percentage.toFixed(2)}%` : '0%'}
                      </span>
                    </div>
                  </div>
                )}
                
                {editingBalance ? (
                  <div className="space-y-3">
                    <div className="text-xs text-gray-400 mb-2">
                      Actualizar balance actual
                    </div>
                    <input
                      type="number"
                      value={newBalance}
                      onChange={(e) => setNewBalance(e.target.value)}
                      placeholder="Ingresa tu balance actual"
                      step="0.01"
                      className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-center"
                    />
                    <div className="flex space-x-2">
                      <button
                        onClick={updateAccountBalance}
                        className="flex-1 bg-green-600 text-white py-2 px-4 rounded text-sm hover:bg-green-700 transition-colors"
                      >
                        Guardar
                      </button>
                      <button
                        onClick={() => {
                          setEditingBalance(false)
                          setNewBalance('')
                        }}
                        className="flex-1 bg-gray-600 text-white py-2 px-4 rounded text-sm hover:bg-gray-700 transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <button
                      onClick={() => {
                        setEditingBalance(true)
                        setNewBalance(profile?.account_balance?.toString() || '1000')
                      }}
                      className="text-blue-400 text-xs hover:text-blue-300 transition-colors"
                    >
                      Editar balance actual
                    </button>
                  </div>
                )}
              </div>

              {/* Contador de trades */}
              <div className="text-center">
                <div className="text-3xl font-bold text-white mb-2">{totalTrades}</div>
                <div className="text-gray-400 text-sm mb-4">Trades registrados</div>
                
                {!isPremium && (
                  <div className="bg-gray-900/50 rounded-lg p-4">
                    {freeTradesLeft > 0 ? (
                      <>
                        <div className="text-lg font-semibold text-green-400 mb-2">
                          {freeTradesLeft} trades gratuitos restantes
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-3 mb-2">
                          <div 
                            className="bg-green-500 h-3 rounded-full transition-all duration-300"
                            style={{ width: `${(freeTradesLeft / 3) * 100}%` }}
                          ></div>
                        </div>
                        <div className="text-gray-400 text-xs">
                          {totalTrades} de 3 trades utilizados
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="text-lg font-semibold text-red-400 mb-2">
                          ¡Límite alcanzado!
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-3 mb-2">
                          <div className="bg-red-500 h-3 rounded-full w-full"></div>
                        </div>
                        <div className="text-gray-400 text-xs mb-3">
                          Has usado todos tus trades gratuitos (3/3)
                        </div>
                        <div className="text-yellow-400 text-sm font-medium">
                          ¡Actualiza a Premium para trades ilimitados!
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Grid de Actividad de Trading */}
          <ActivityGrid trades={trades} />

          {/* Estadísticas básicas */}
          {stats && stats.total_trades > 0 && (
            <div className="bg-gray-800/60 backdrop-blur-sm rounded-lg p-6 border border-gray-700 mb-6">
              <h3 className="text-white font-semibold text-lg mb-4 text-center">Estadísticas</h3>
              
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-xl font-bold text-green-400">{stats.wins || 0}</div>
                  <div className="text-gray-400 text-xs">Wins</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-red-400">{stats.losses || 0}</div>
                  <div className="text-gray-400 text-xs">Losses</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-yellow-400">{stats.breakevens || 0}</div>
                  <div className="text-gray-400 text-xs">BE</div>
                </div>
              </div>

              {/* Win Rate */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-400 text-sm">Win Rate</span>
                  <span className="text-white font-semibold">
                    {Math.round((stats.wins / stats.total_trades) * 100)}%
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.round((stats.wins / stats.total_trades) * 100)}%` }}
                  ></div>
                </div>
              </div>

              {/* Estadísticas financieras */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t border-gray-700">
                <div className="text-center">
                  <div className="text-lg font-bold text-blue-400">
                    {stats.total_pnl_percentage ? `${stats.total_pnl_percentage > 0 ? '+' : ''}${stats.total_pnl_percentage.toFixed(2)}%` : '0%'}
                  </div>
                  <div className="text-gray-400 text-xs">P&L (%)</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-purple-400">
                    {stats.total_pnl_pips ? `${stats.total_pnl_pips > 0 ? '+' : ''}${stats.total_pnl_pips.toFixed(1)}` : '0'}
                  </div>
                  <div className="text-gray-400 text-xs">P&L (Pips)</div>
                </div>
                <div className="text-center md:col-span-1 col-span-2">
                  <div className="text-lg font-bold text-green-400">
                    {stats.total_pnl_money ? `${stats.total_pnl_money > 0 ? '+' : ''}$${stats.total_pnl_money.toFixed(2)}` : '$0.00'}
                  </div>
                  <div className="text-gray-400 text-xs">P&L ($)</div>
                </div>
              </div>
            </div>
          )}

          {/* Botón Premium */}
          {!isPremium && (
            <div className="relative rounded-lg p-6 backdrop-blur-sm border transition-all duration-300 hover:scale-105 hover:border-purple-500/50 bg-gradient-to-b from-purple-500/10 to-blue-500/10 border-purple-500/30 mb-6">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <div className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                  Más Popular
                </div>
              </div>

              <div className="text-center">
                <div className="text-3xl mb-3">🚀</div>
                <h3 className="text-lg font-bold mb-2 text-white">Actualiza a Premium</h3>
                <p className="text-gray-400 text-sm mb-4">Lleva tu trading al siguiente nivel</p>
                
                <div className="mb-4">
                  <div className="flex items-baseline justify-center">
                    <span className="text-2xl font-bold text-white">
                      $5.99
                    </span>
                    <span className="text-gray-400 text-sm ml-1">
                      /mes
                    </span>
                  </div>
                  <div className="text-xs text-green-400 mt-1 font-medium">
                    Ahorra $22/año con plan anual
                  </div>
                </div>

                <ul className="space-y-2 mb-6 text-left text-sm">
                  <li className="flex items-start">
                    <svg className="w-4 h-4 text-green-400 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-300">Trades ilimitados</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-4 h-4 text-green-400 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-300">Análisis avanzado con IA</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-4 h-4 text-green-400 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-300">Reportes detallados PDF</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-4 h-4 text-green-400 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-300">Soporte prioritario</span>
                  </li>
                </ul>

                <button 
                  onClick={() => {
                    const email = user?.email || ''
                    const stripeUrl = `https://buy.stripe.com/cNidRa8XtdYN94G31EaR207${email ? `?prefilled_email=${encodeURIComponent(email)}` : ''}`
                    window.open(stripeUrl, '_blank')
                  }}
                  className="w-full py-3 px-4 rounded-lg font-semibold text-white transition-all duration-200 transform hover:scale-105 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-sm"
                >
                  Comenzar Premium
                </button>
              </div>
            </div>
          )}

          {/* Sección de Consejos de IA */}
          <div className="mb-6">
            <h2 className="text-white text-lg font-semibold mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
              Consejo de IA
            </h2>
            <TradeAdviceCard className="mb-6" />
          </div>

          {/* Navegación rápida */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link
              href="/"
              className={`block w-full font-semibold py-3 px-6 rounded-lg transition-colors text-center ${
                isTrialExpired 
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
              onClick={(e) => {
                if (isTrialExpired) {
                  e.preventDefault()
                  alert('Has alcanzado el límite de trades gratuitos. Actualiza a Premium para continuar.')
                }
              }}
            >
              {isTrialExpired ? 'Límite Alcanzado' : 'Registrar Nuevo Trade'}
            </Link>
            <Link
              href="/trades"
              className="block w-full bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors text-center"
            >
              Ver Mis Trades
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  )
} 