'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

interface Trade {
  id: string
  title: string
  pair: string
  timeframe: string
  result: string
  risk_reward: string
  created_at: string
  bias: string
  confidence: number
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
      await loadTrades(user.id)
      setLoading(false)
    }

    getUser()
  }, [router, supabase.auth])

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

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
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
            className="text-white font-medium hover:text-gray-300 transition-colors"
          >
            Mis Trades
          </Link>
          <Link
            href="/profile"
            className="text-gray-400 font-medium hover:text-white transition-colors"
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
        <div className="max-w-4xl mx-auto px-6 py-6">
          {/* Título principal */}
          <h1 className="text-xl md:text-2xl font-bold text-white text-center mb-6">
            Mis Trades
          </h1>

          {/* Lista de trades */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {trades && trades.length > 0 ? (
              trades.map((trade) => (
                <div key={trade.id} className="bg-gray-800/60 backdrop-blur-sm rounded-lg p-4 border border-gray-700">
                  {/* Imagen del trade */}
                  {trade.screenshot_url && (
                    <div className="mb-3">
                      <img
                        src={trade.screenshot_url}
                        alt={`Screenshot de ${trade.title}`}
                        className="w-full h-48 object-cover rounded-lg"
                      />
                    </div>
                  )}
                  
                  {/* Información del trade */}
                  <div className="space-y-2">
                    <h3 className="text-white font-semibold text-lg">{trade.title}</h3>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-300 text-sm">{trade.pair}</span>
                        <span className="text-gray-500">•</span>
                        <span className="text-gray-300 text-sm">{trade.timeframe}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          trade.bias === 'alcista' 
                            ? 'bg-green-600/20 text-green-400 border border-green-600/30' 
                            : 'bg-red-600/20 text-red-400 border border-red-600/30'
                        }`}>
                          {trade.bias === 'alcista' ? 'Alcista' : 'Bajista'}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          trade.result === 'win' 
                            ? 'bg-green-600/20 text-green-400 border border-green-600/30'
                            : trade.result === 'loss'
                              ? 'bg-red-600/20 text-red-400 border border-red-600/30'
                              : 'bg-yellow-600/20 text-yellow-400 border border-yellow-600/30'
                        }`}>
                          {trade.result === 'win' ? 'Win' : trade.result === 'loss' ? 'Loss' : 'BE'}
                        </span>
                      </div>
                    </div>

                    {trade.session && (
                      <div className="text-gray-400 text-sm">
                        Sesión: {trade.session === 'asian' ? 'Asiática' : 
                                trade.session === 'london' ? 'Londres' : 
                                trade.session === 'newyork' ? 'Nueva York' : 
                                'Solapamiento'}
                      </div>
                    )}

                    {trade.risk_reward && (
                      <div className="text-gray-400 text-sm">
                        Risk:Reward: {trade.risk_reward}
                      </div>
                    )}

                    {trade.confidence && (
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-400 text-sm">Confianza:</span>
                        <span className="text-white font-medium">{trade.confidence}%</span>
                        <span className="text-lg">
                          {trade.confidence <= 30 ? '😞' : 
                           trade.confidence <= 70 ? '🤔' : '😊'}
                        </span>
                      </div>
                    )}

                    {/* P&L Information - Mejorado para mostrar cualquier tipo */}
                    {(trade.pnl_percentage || trade.pnl_pips || trade.pnl_money) && (
                      <div className="bg-gray-900/50 rounded-lg p-3 mt-3">
                        <div className="text-gray-400 text-xs mb-2">Resultado Financiero</div>
                        <div className="flex justify-center">
                          <div className="text-center">
                            {trade.pnl_percentage && (
                              <div className={`text-lg font-bold ${
                                trade.pnl_percentage > 0 ? 'text-green-400' : 
                                trade.pnl_percentage < 0 ? 'text-red-400' : 'text-gray-400'
                              }`}>
                                {trade.pnl_percentage > 0 ? '+' : ''}{trade.pnl_percentage.toFixed(2)}%
                              </div>
                            )}
                            {trade.pnl_pips && (
                              <div className={`text-lg font-bold ${
                                trade.pnl_pips > 0 ? 'text-green-400' : 
                                trade.pnl_pips < 0 ? 'text-red-400' : 'text-gray-400'
                              }`}>
                                {trade.pnl_pips > 0 ? '+' : ''}{trade.pnl_pips.toFixed(1)} pips
                              </div>
                            )}
                            {trade.pnl_money && (
                              <div className={`text-lg font-bold ${
                                trade.pnl_money > 0 ? 'text-green-400' : 
                                trade.pnl_money < 0 ? 'text-red-400' : 'text-gray-400'
                              }`}>
                                {trade.pnl_money > 0 ? '+' : ''}${trade.pnl_money.toFixed(2)}
                              </div>
                            )}
                            <div className="text-gray-500 text-xs">
                              {trade.pnl_percentage ? 'Porcentaje' : 
                               trade.pnl_pips ? 'Pips' : 
                               'Dinero'}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Confluences */}
                    {trade.confluences && (
                      <div className="text-gray-300 text-sm mt-3 p-3 bg-gray-900/50 rounded-lg">
                        <div className="text-gray-400 text-xs mb-1">Confluencias:</div>
                        {trade.confluences}
                      </div>
                    )}

                    {trade.description && (
                      <div className="text-gray-300 text-sm mt-3 p-3 bg-gray-900/50 rounded-lg">
                        <div className="text-gray-400 text-xs mb-1">Descripción:</div>
                        {trade.description}
                      </div>
                    )}

                    <div className="text-gray-500 text-xs mt-3">
                      {new Date(trade.created_at).toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full text-center py-12">
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
      </div>

      {/* Bottom Navigation Menu - Solo móvil */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur-sm border-t border-gray-800 z-50">
        <div className="flex justify-around items-center py-2">
          {/* Nuevo Trade */}
          <Link
            href="/"
            className="flex flex-col items-center py-2 px-4 text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6 mb-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            <span className="text-xs font-medium">Nuevo</span>
          </Link>

          {/* Mis Trades - Página actual */}
          <Link
            href="/trades"
            className="flex flex-col items-center py-2 px-4 text-white"
          >
            <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span className="text-xs font-medium">Trades</span>
          </Link>

          {/* Perfil */}
          <Link
            href="/profile"
            className="flex flex-col items-center py-2 px-4 text-gray-400 hover:text-white transition-colors"
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