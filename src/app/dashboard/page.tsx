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
}

export default function Dashboard() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [trades, setTrades] = useState<Trade[]>([])
  const [stats, setStats] = useState({
    totalTrades: 0,
    winRate: 0,
    profitFactor: 0,
    expectancy: 0,
    avgRiskReward: 0
  })
  
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
        .limit(10)

      if (error) {
        console.error('Error loading trades:', error)
        return
      }

      setTrades(data || [])
      calculateStats(data || [])
    } catch (err) {
      console.error('Error:', err)
    }
  }

  const calculateStats = (tradesData: Trade[]) => {
    if (tradesData.length === 0) {
      setStats({
        totalTrades: 0,
        winRate: 0,
        profitFactor: 0,
        expectancy: 0,
        avgRiskReward: 0
      })
      return
    }

    const wins = tradesData.filter(t => t.result === 'win').length
    const losses = tradesData.filter(t => t.result === 'loss').length
    const winRate = Math.round((wins / tradesData.length) * 100)
    
    // Simulamos algunos valores para el ejemplo
    const profitFactor = 2.5
    const expectancy = 1.8
    const avgRiskReward = 1.6

    setStats({
      totalTrades: tradesData.length,
      winRate,
      profitFactor,
      expectancy,
      avgRiskReward
    })
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const getResultColor = (result: string) => {
    switch (result) {
      case 'win': return 'text-green-400 bg-green-600/20'
      case 'loss': return 'text-red-400 bg-red-600/20'
      case 'be': return 'text-yellow-400 bg-yellow-600/20'
      default: return 'text-gray-400 bg-gray-600/20'
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
            className="bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors text-sm"
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

      <div className="max-w-4xl mx-auto px-6 pb-8">
        {/* Título */}
        <h1 className="text-2xl font-bold text-white text-center mb-8">
          Progreso
        </h1>

        {/* Cards de estadísticas */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <div className="bg-gray-800/60 border border-gray-600 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-white mb-1">{stats.profitFactor}</div>
            <div className="text-gray-400 text-xs">Profit Factor</div>
            <div className="text-gray-500 text-xs mt-1">Últimos 30 días</div>
          </div>
          <div className="bg-gray-800/60 border border-gray-600 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-white mb-1">{stats.expectancy}R</div>
            <div className="text-gray-400 text-xs">Expectancy</div>
            <div className="text-gray-500 text-xs mt-1">Media por trade</div>
          </div>
          <div className="bg-gray-800/60 border border-gray-600 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-400 mb-1">{stats.winRate}%</div>
            <div className="text-gray-400 text-xs">Win Rate</div>
            <div className="text-gray-500 text-xs mt-1">{stats.totalTrades} trades</div>
          </div>
        </div>

        {/* Rendimiento Mensual */}
        <div className="bg-gray-800/60 border border-gray-600 rounded-lg p-4 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-white font-semibold">Rendimiento Mensual</h3>
            <select className="bg-gray-700 text-white text-sm px-3 py-1 rounded border border-gray-600">
              <option>Últimos 6 meses</option>
            </select>
          </div>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-gray-400">Junio 2025</div>
              <div className="text-green-400 font-semibold">+5.2%</div>
            </div>
            <div>
              <div className="text-gray-400">Mayo 2025</div>
              <div className="text-red-400 font-semibold">-2.1%</div>
            </div>
            <div>
              <div className="text-gray-400">Abril 2025</div>
              <div className="text-green-400 font-semibold">+3.8%</div>
            </div>
            <div>
              <div className="text-gray-400">Marzo 2025</div>
              <div className="text-green-400 font-semibold">+4.1%</div>
            </div>
            <div>
              <div className="text-gray-400">Febrero 2025</div>
              <div className="text-red-400 font-semibold">-2.8%</div>
            </div>
            <div>
              <div className="text-gray-400">Enero 2025</div>
              <div className="text-red-400 font-semibold">-1.5%</div>
            </div>
          </div>
        </div>

        {/* Tus últimos trades */}
        <div className="mb-8">
          <h3 className="text-white font-semibold mb-4">Tus últimos trades</h3>
          <div className="space-y-3">
            {trades.length === 0 ? (
              <div className="bg-gray-800/60 border border-gray-600 rounded-lg p-6 text-center">
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
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center space-x-3">
                      <div className="bg-gray-700 rounded-lg px-2 py-1">
                        <span className="text-white font-bold text-sm">IMG</span>
                      </div>
                      <div>
                        <div className="text-white font-semibold text-sm">{trade.pair} {trade.timeframe}</div>
                        <div className="text-gray-400 text-xs">
                          {new Date(trade.created_at).toLocaleDateString()} • {trade.risk_reward}
                        </div>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${getResultColor(trade.result)}`}>
                      {getResultText(trade.result)}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1 mb-2">
                    <span className="bg-gray-700 text-gray-300 px-2 py-0.5 rounded text-xs">
                      {trade.bias === 'alcista' ? 'Alcista' : 'Bajista'}
                    </span>
                    {trade.timeframe && (
                      <span className="bg-gray-700 text-gray-300 px-2 py-0.5 rounded text-xs">
                        {trade.timeframe}
                      </span>
                    )}
                  </div>
                  <p className="text-gray-300 text-sm line-clamp-2">
                    {trade.description || trade.title}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Trading Performance */}
        <div className="bg-gray-800/60 border border-gray-600 rounded-lg p-4 mb-8">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-white font-semibold">Trading Performance</h3>
              <div className="text-gray-400 text-sm">Últimos 30 días</div>
            </div>
            <select className="bg-gray-700 text-white text-sm px-3 py-1 rounded border border-gray-600">
              <option>30 días</option>
            </select>
          </div>
          
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <div className="text-gray-400 text-sm mb-1">Win Rate</div>
              <div className="text-green-400 font-bold text-lg">{stats.winRate}%</div>
              <div className="w-full bg-gray-700 rounded-full h-1">
                <div className="bg-green-400 h-1 rounded-full" style={{ width: `${stats.winRate}%` }}></div>
              </div>
            </div>
            <div>
              <div className="text-gray-400 text-sm mb-1">Avg Risk/Reward</div>
              <div className="text-white font-bold text-lg">{stats.avgRiskReward}R</div>
              <div className="w-full bg-gray-700 rounded-full h-1">
                <div className="bg-blue-400 h-1 rounded-full" style={{ width: '60%' }}></div>
              </div>
            </div>
            <div>
              <div className="text-gray-400 text-sm mb-1">Profit Factor</div>
              <div className="text-green-400 font-bold text-lg">{stats.profitFactor}</div>
              <div className="w-full bg-gray-700 rounded-full h-1">
                <div className="bg-green-400 h-1 rounded-full" style={{ width: '75%' }}></div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 text-center text-sm">
            <div>
              <div className="text-white font-bold text-xl">{stats.totalTrades}</div>
              <div className="text-gray-400">Trades</div>
            </div>
            <div>
              <div className="text-green-400 font-bold text-xl">+5.2%</div>
              <div className="text-gray-400">Mejor día</div>
            </div>
            <div>
              <div className="text-red-400 font-bold text-xl">-2.1%</div>
              <div className="text-gray-400">Drawdown</div>
            </div>
          </div>
        </div>

        {/* Accuracy Grid */}
        <div className="bg-gray-800/60 border border-gray-600 rounded-lg p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-white font-semibold">⚏ Accuracy Grid</h3>
            <select className="bg-gray-700 text-white text-sm px-3 py-1 rounded border border-gray-600">
              <option>All Habits ▼</option>
            </select>
          </div>
          
          <div className="grid grid-cols-14 gap-1 mb-2">
            {Array.from({ length: 98 }, (_, i) => (
              <div
                key={i}
                className={`w-3 h-3 rounded-sm ${
                  Math.random() > 0.3 ? 'bg-green-500' : 'bg-gray-700'
                }`}
              ></div>
            ))}
          </div>
          
          <div className="flex justify-between items-center text-xs text-gray-400">
            <span>Less</span>
            <div className="flex space-x-1">
              <div className="w-3 h-3 bg-gray-700 rounded-sm"></div>
              <div className="w-3 h-3 bg-green-700 rounded-sm"></div>
              <div className="w-3 h-3 bg-green-600 rounded-sm"></div>
              <div className="w-3 h-3 bg-green-500 rounded-sm"></div>
              <div className="w-3 h-3 bg-green-400 rounded-sm"></div>
            </div>
            <span>More</span>
          </div>
        </div>
      </div>
    </div>
  )
} 