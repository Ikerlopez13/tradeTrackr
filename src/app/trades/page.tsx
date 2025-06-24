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
  feeling: number
  description: string
  screenshot_url: string | null
  session: string
}

export default function MyTrades() {
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

  const getResultColor = (result: string) => {
    switch (result) {
      case 'win': return 'text-green-400 bg-green-600/20 border-green-600'
      case 'loss': return 'text-red-400 bg-red-600/20 border-red-600'
      case 'be': return 'text-yellow-400 bg-yellow-600/20 border-yellow-600'
      default: return 'text-gray-400 bg-gray-600/20 border-gray-600'
    }
  }

  const getResultText = (result: string) => {
    switch (result) {
      case 'win': return 'WIN'
      case 'loss': return 'LOSS'
      case 'be': return 'BE'
      default: return result.toUpperCase()
    }
  }

  const getBiasColor = (bias: string) => {
    return bias === 'alcista' ? 'bg-green-600/20 text-green-400' : 'bg-red-600/20 text-red-400'
  }

  const getBiasText = (bias: string) => {
    return bias === 'alcista' ? 'Alcista' : 'Bajista'
  }

  const getConfidenceEmoji = (feeling: number) => {
    if (feeling <= 33) return '😞'
    if (feeling <= 66) return '🤔'
    return '😊'
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
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
      {/* Navbar */}
      <nav className="max-w-4xl mx-auto pt-6 pb-4 px-6 flex justify-between items-center">
        <div className="flex items-center">
          <Image
            src="/logo.jpeg"
            alt="TradeTrackr Logo"
            width={40}
            height={40}
            priority
            unoptimized
            className="rounded-lg mr-3"
          />
          <h1 className="text-xl font-bold text-white">TradeTrackr</h1>
        </div>
        <div className="flex items-center space-x-3">
          <span className="text-gray-400 text-sm">{user.email}</span>
          <Link
            href="/"
            className="bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition-colors text-sm"
          >
            Nuevo Trade
          </Link>
          <Link
            href="/profile"
            className="bg-gray-600 text-white px-3 py-1.5 rounded-lg hover:bg-gray-700 transition-colors text-sm"
          >
            Perfil
          </Link>
          <button
            onClick={handleLogout}
            className="bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 transition-colors text-sm"
          >
            Cerrar Sesión
          </button>
        </div>
      </nav>

      <div className="max-w-md mx-auto px-6 pb-8">
        {/* Título */}
        <h1 className="text-2xl font-bold text-white text-center mb-8">
          Mis Trades
        </h1>

        {/* Estadísticas rápidas */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-gray-800/60 border border-gray-600 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-white">{trades.length}</div>
            <div className="text-gray-400 text-xs">Total</div>
          </div>
          <div className="bg-gray-800/60 border border-gray-600 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-green-400">
              {trades.filter(t => t.result === 'win').length}
            </div>
            <div className="text-gray-400 text-xs">Wins</div>
          </div>
          <div className="bg-gray-800/60 border border-gray-600 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-red-400">
              {trades.filter(t => t.result === 'loss').length}
            </div>
            <div className="text-gray-400 text-xs">Losses</div>
          </div>
        </div>

        {/* Lista de trades */}
        <div className="space-y-4">
          {trades.length === 0 ? (
            <div className="bg-gray-800/60 border border-gray-600 rounded-lg p-8 text-center">
              <div className="text-4xl mb-4">📊</div>
              <div className="text-gray-400 mb-4">No tienes trades registrados aún</div>
              <Link
                href="/"
                className="bg-white text-black font-semibold py-2 px-4 rounded-lg hover:bg-gray-100 transition-colors text-sm"
              >
                Registrar primer trade
              </Link>
            </div>
          ) : (
            trades.map((trade) => (
              <div key={trade.id} className="bg-gray-800/60 border border-gray-600 rounded-lg p-4">
                {/* Header del trade */}
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h3 className="text-white font-semibold text-base mb-1">
                      {trade.title}
                    </h3>
                    <div className="text-gray-400 text-sm">
                      {formatDate(trade.created_at)}
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-semibold border ${getResultColor(trade.result)}`}>
                    {getResultText(trade.result)}
                  </span>
                </div>

                {/* Screenshot si existe */}
                {trade.screenshot_url && (
                  <div className="mb-3">
                    <img
                      src={trade.screenshot_url}
                      alt="Trade Screenshot"
                      className="w-full max-h-48 object-cover rounded-lg"
                    />
                  </div>
                )}

                {/* Información del trade */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="bg-gray-700/50 rounded-lg p-2">
                    <div className="text-gray-400 text-xs">Par</div>
                    <div className="text-white font-semibold text-sm">{trade.pair}</div>
                  </div>
                  <div className="bg-gray-700/50 rounded-lg p-2">
                    <div className="text-gray-400 text-xs">Timeframe</div>
                    <div className="text-white font-semibold text-sm">{trade.timeframe}</div>
                  </div>
                  <div className="bg-gray-700/50 rounded-lg p-2">
                    <div className="text-gray-400 text-xs">Risk:Reward</div>
                    <div className="text-white font-semibold text-sm">{trade.risk_reward}</div>
                  </div>
                  <div className="bg-gray-700/50 rounded-lg p-2">
                    <div className="text-gray-400 text-xs">Sesión</div>
                    <div className="text-white font-semibold text-sm capitalize">
                      {trade.session || 'N/A'}
                    </div>
                  </div>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-2 mb-3">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getBiasColor(trade.bias)}`}>
                    {getBiasText(trade.bias)}
                  </span>
                  <span className="bg-gray-700 text-gray-300 px-2 py-1 rounded text-xs">
                    {getConfidenceEmoji(trade.feeling)} {trade.feeling}%
                  </span>
                </div>

                {/* Descripción */}
                {trade.description && (
                  <div className="border-t border-gray-700 pt-3">
                    <p className="text-gray-300 text-sm leading-relaxed">
                      {trade.description}
                    </p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
} 