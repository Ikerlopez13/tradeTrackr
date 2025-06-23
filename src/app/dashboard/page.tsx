import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

async function getTradesData(userId: string) {
  const supabase = await createClient()
  
  const { data: trades, error } = await supabase
    .from('trades')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching trades:', error)
    return []
  }

  return trades || []
}

export default async function DashboardPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const trades = await getTradesData(user.id)

  // Calcular estadísticas
  const totalTrades = trades.length
  const winningTrades = trades.filter(trade => trade.result === 'win').length
  const losingTrades = trades.filter(trade => trade.result === 'loss').length
  const breakEvenTrades = trades.filter(trade => trade.result === 'be').length
  const winRate = totalTrades > 0 ? Math.round((winningTrades / totalTrades) * 100) : 0

  const handleLogout = async () => {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#000510] via-[#0a0a1a] to-[#0f0f2a] p-6">
      {/* Navbar */}
      <nav className="max-w-6xl mx-auto mb-8 flex justify-between items-center">
        <div className="flex items-center">
          <Image
            src="/logo.jpeg"
            alt="TradeTracker Logo"
            width={50}
            height={50}
            className="rounded-lg mr-3 shadow-lg border border-white/20"
            style={{
              filter: 'drop-shadow(0 0 15px rgba(255, 255, 255, 0.2))'
            }}
          />
          <h1 className="text-2xl font-bold text-white">TradeTracker</h1>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-gray-400">Hola, {user.email}</span>
          <Link
            href="/"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Nuevo Trade
          </Link>
          <form action={handleLogout}>
            <button
              type="submit"
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              Cerrar Sesión
            </button>
          </form>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">Dashboard</h1>
          <p className="text-gray-400 text-lg">Análisis de tu rendimiento trading</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="bg-black/20 backdrop-blur-sm border border-gray-600 rounded-xl p-6">
            <h3 className="text-gray-400 text-sm font-semibold mb-2">Total Trades</h3>
            <p className="text-3xl font-bold text-white">{totalTrades}</p>
          </div>
          
          <div className="bg-black/20 backdrop-blur-sm border border-green-500/50 rounded-xl p-6">
            <h3 className="text-gray-400 text-sm font-semibold mb-2">Trades Ganadores</h3>
            <p className="text-3xl font-bold text-green-400">{winningTrades}</p>
          </div>
          
          <div className="bg-black/20 backdrop-blur-sm border border-red-500/50 rounded-xl p-6">
            <h3 className="text-gray-400 text-sm font-semibold mb-2">Trades Perdedores</h3>
            <p className="text-3xl font-bold text-red-400">{losingTrades}</p>
          </div>
          
          <div className="bg-black/20 backdrop-blur-sm border border-blue-500/50 rounded-xl p-6">
            <h3 className="text-gray-400 text-sm font-semibold mb-2">Win Rate</h3>
            <p className="text-3xl font-bold text-blue-400">{winRate}%</p>
          </div>
        </div>

        {/* Recent Trades */}
        <div className="bg-black/20 backdrop-blur-sm border border-gray-600 rounded-xl p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white">Trades Recientes</h2>
            <Link
              href="/"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Nuevo Trade
            </Link>
          </div>

          {trades.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📊</div>
              <h3 className="text-xl font-semibold text-white mb-2">
                No tienes trades registrados
              </h3>
              <p className="text-gray-400 mb-6">
                Comienza registrando tu primer trade para ver tu progreso
              </p>
              <Link
                href="/"
                className="inline-block bg-white text-black font-bold py-3 px-6 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Registrar Primer Trade
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {trades.slice(0, 10).map((trade) => (
                <div
                  key={trade.id}
                  className="bg-black/40 border border-gray-700 rounded-lg p-4 hover:border-gray-500 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-white font-semibold">{trade.title}</h3>
                        <span className="text-gray-400 text-sm">
                          {trade.pair} • {trade.timeframe}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          trade.result === 'win' 
                            ? 'bg-green-600 text-white' 
                            : trade.result === 'loss'
                            ? 'bg-red-600 text-white'
                            : 'bg-yellow-600 text-white'
                        }`}>
                          {trade.result === 'win' ? 'WIN' : trade.result === 'loss' ? 'LOSS' : 'BE'}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-400">
                        <span>R:R {trade.risk_reward}</span>
                        {trade.bias && (
                          <span className={`px-2 py-1 rounded text-xs ${
                            trade.bias === 'alcista' 
                              ? 'bg-green-600/20 text-green-400'
                              : 'bg-red-600/20 text-red-400'
                          }`}>
                            {trade.bias === 'alcista' ? 'Alcista' : 'Bajista'}
                          </span>
                        )}
                        <span>Confianza: {trade.feeling}%</span>
                      </div>
                      
                      {trade.description && (
                        <p className="text-gray-300 text-sm mt-2 line-clamp-2">
                          {trade.description}
                        </p>
                      )}
                    </div>
                    
                    <div className="text-right">
                      <p className="text-gray-400 text-sm">
                        {new Date(trade.created_at).toLocaleDateString('es-ES', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 