'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [editingBalance, setEditingBalance] = useState(false)
  const [newBalance, setNewBalance] = useState('')
  
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
      // Cargar estadísticas
      const { data: statsData } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', userId)
        .single()

      setStats(statsData)

      // Cargar perfil
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      setProfile(profileData)
    } catch (err) {
      console.error('Error loading user data:', err)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const updateAccountBalance = async () => {
    if (!user || !newBalance) return

    try {
      const balance = parseFloat(newBalance)
      if (isNaN(balance) || balance <= 0) {
        alert('Por favor ingresa un balance válido')
        return
      }

      const { error } = await supabase
        .from('profiles')
        .update({ account_balance: balance })
        .eq('id', user.id)

      if (error) {
        console.error('Error updating balance:', error)
        alert('Error al actualizar el balance')
      } else {
        setProfile({ ...profile, account_balance: balance })
        setEditingBalance(false)
        setNewBalance('')
        alert('Balance actualizado exitosamente')
      }
    } catch (err) {
      console.error('Error:', err)
      alert('Error inesperado')
    }
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
  const freeTradesLeft = Math.max(0, 15 - totalTrades)
  const isTrialExpired = !isPremium && totalTrades >= 15

  return (
    <div className="min-h-screen" style={{backgroundColor: '#010314'}}>
      {/* Header móvil (solo en pantallas pequeñas) */}
      <header className="md:hidden sticky top-0 z-50 bg-gray-900/80 backdrop-blur-sm border-b border-gray-800">
        <div className="flex items-center justify-center py-4 px-6">
          <Image
            src="/logo.jpeg"
            alt="TradeTrackr Logo"
            width={32}
            height={32}
            priority
            unoptimized
            className="rounded-lg mr-3"
          />
          <h1 className="text-lg font-bold text-white">TradeTrackr</h1>
        </div>
      </header>

      {/* Navbar desktop (solo en pantallas grandes) */}
      <nav className="hidden md:flex items-center justify-between px-8 py-4 bg-gray-900/80 backdrop-blur-sm border-b border-gray-800">
        <div className="flex items-center">
          <Image
            src="/logo.jpeg"
            alt="TradeTrackr Logo"
            width={40}
            height={40}
            priority
            unoptimized
            className="rounded-lg mr-4"
          />
          <h1 className="text-2xl font-bold text-white">TradeTrackr</h1>
        </div>
        
        <div className="flex items-center space-x-6">
          <Link
            href="/"
            className="text-gray-400 font-medium hover:text-white transition-colors"
          >
            Nuevo Trade
          </Link>
          <Link
            href="/trades"
            className="text-gray-400 font-medium hover:text-white transition-colors"
          >
            Mis Trades
          </Link>
          <Link
            href="/profile"
            className="text-white font-medium hover:text-gray-300 transition-colors"
          >
            Perfil
          </Link>
          <button
            onClick={handleLogout}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Cerrar Sesión
          </button>
        </div>
      </nav>

      {/* Contenido principal */}
      <div className="pb-20 md:pb-8">
        <div className="max-w-2xl mx-auto px-6 py-6">
          {/* Título principal */}
          <h1 className="text-xl md:text-2xl font-bold text-white text-center mb-8">
            Mi Perfil
          </h1>

          {/* Información del usuario */}
          <div className="bg-gray-800/60 backdrop-blur-sm rounded-lg p-6 border border-gray-700 mb-6">
            <div className="text-center">
              <div className="w-20 h-20 bg-gray-600 rounded-full mx-auto mb-4 flex items-center justify-center">
                <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h2 className="text-white font-semibold text-xl mb-2">{user.email}</h2>
              
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
                {editingBalance ? (
                  <div className="space-y-3">
                    <input
                      type="number"
                      value={newBalance}
                      onChange={(e) => setNewBalance(e.target.value)}
                      placeholder="Ingresa tu balance inicial"
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
                  <div>
                    <div className="text-2xl font-bold text-green-400 mb-1">
                      ${(profile?.account_balance || 1000).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <button
                      onClick={() => {
                        setEditingBalance(true)
                        setNewBalance(profile?.account_balance?.toString() || '1000')
                      }}
                      className="text-blue-400 text-xs hover:text-blue-300 transition-colors"
                    >
                      Editar balance
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
                            style={{ width: `${(freeTradesLeft / 15) * 100}%` }}
                          ></div>
                        </div>
                        <div className="text-gray-400 text-xs">
                          {totalTrades} de 15 trades utilizados
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
                          Has usado todos tus trades gratuitos (15/15)
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
            <div className="bg-gradient-to-r from-yellow-600 to-yellow-500 rounded-lg p-6 border border-yellow-500/30 mb-6">
              <div className="text-center">
                <div className="text-3xl mb-2">⭐</div>
                <h3 className="text-white font-bold text-xl mb-2">Actualiza a Premium</h3>
                <p className="text-yellow-100 text-sm mb-4">
                  • Trades ilimitados<br/>
                  • Análisis avanzados<br/>
                  • Exportar datos<br/>
                  • Soporte prioritario
                </p>
                <button className="w-full bg-white text-yellow-600 font-bold py-3 px-6 rounded-lg hover:bg-gray-100 transition-colors">
                  Upgrade a Premium - $5.99/mes
                </button>
              </div>
            </div>
          )}

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
            <button
              onClick={handleLogout}
              className="w-full bg-red-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-red-700 transition-colors md:hidden md:col-span-2"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Navigation Menu - Solo móvil */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur-sm border-t border-gray-800 z-50">
        <div className="flex justify-around items-center py-2">
          {/* Nuevo Trade */}
          <Link
            href="/"
            className={`flex flex-col items-center py-2 px-4 transition-colors ${
              isTrialExpired ? 'text-gray-600' : 'text-gray-400 hover:text-white'
            }`}
            onClick={(e) => {
              if (isTrialExpired) {
                e.preventDefault()
                alert('Has alcanzado el límite de trades gratuitos. Actualiza a Premium para continuar.')
              }
            }}
          >
            <svg className="w-6 h-6 mb-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            <span className="text-xs font-medium">Nuevo</span>
          </Link>

          {/* Mis Trades */}
          <Link
            href="/trades"
            className="flex flex-col items-center py-2 px-4 text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span className="text-xs font-medium">Trades</span>
          </Link>

          {/* Perfil - Página actual */}
          <Link
            href="/profile"
            className="flex flex-col items-center py-2 px-4 text-white"
          >
            <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-xs font-medium">Perfil</span>
          </Link>
        </div>
      </nav>
    </div>
  )
} 