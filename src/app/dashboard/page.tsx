'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Layout from '@/components/Layout';
import LoadingSpinner from '@/components/LoadingSpinner';
import { 
  BarChart2, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Target, 
  Clock, 
  Award,
  Activity,
  PieChart,
  LineChart,
  Calendar,
  Users,
  Zap,
  BarChart3
} from 'lucide-react';

interface DashboardStats {
  accountBalance: number;
  totalPnL: number;
  totalTrades: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  bestTrade: number;
  worstTrade: number;
  todayPnL: number;
  weekPnL: number;
  monthPnL: number;
}

interface RecentTrade {
  id: string;
  pair: string;
  result: 'win' | 'loss' | 'be';
  entry_price?: number;
  exit_price?: number;
  pnl_percentage?: number;
  pnl_pips?: number;
  pnl_money?: number;
  created_at: string;
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [userStats, setUserStats] = useState<any>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentTrades, setRecentTrades] = useState<RecentTrade[]>([]);
  const [selectedTimeframe, setSelectedTimeframe] = useState('today');

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);
      
      // Cargar TODOS los datos en paralelo
      const [profileData, tradesData, userStatsData] = await Promise.all([
        loadUserProfile(user.id),
        loadRecentTrades(user.id),
        loadUserStats(user.id)
      ]);
      
      // Calcular estadísticas DESPUÉS de tener todos los datos
      if (profileData && tradesData && userStatsData) {
        const calculatedStats = calculateStats(tradesData, profileData, userStatsData);
        setStats(calculatedStats);
      }
      
      setLoading(false);
    };

    getUser();
  }, [router]);

  const loadUserProfile = async (userId: string) => {
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      setProfile(profileData);
      return profileData;
    } catch (error) {
      console.error('Error loading profile:', error);
      return null;
    }
  };

  const loadUserStats = async (userId: string) => {
    try {
      const { data: statsData } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      setUserStats(statsData);
      return statsData;
    } catch (error) {
      console.error('Error loading stats:', error);
      return null;
    }
  };

  const loadRecentTrades = async (userId: string) => {
    try {
      const { data: tradesData } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (tradesData) {
        setRecentTrades(tradesData);
        return tradesData;
      }
      return [];
    } catch (error) {
      console.error('Error loading trades:', error);
      return [];
    }
  };

  const calculateStats = (trades: any[], profileData: any, userStatsData: any): DashboardStats => {
    // Use the SAME data source as profile page: user_stats table
    const totalTrades = userStatsData?.total_trades || 0;
    const wins = userStatsData?.wins || 0;
    const losses = userStatsData?.losses || 0;
    const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
    
    // P&L from user_stats (same as profile)
    const totalPnLPercentage = userStatsData?.total_pnl_percentage || 0;
    const totalPnLMoney = userStatsData?.total_pnl_money || 0;
    const totalPnLPips = userStatsData?.total_pnl_pips || 0;
    
    // Calculate averages from user_stats
    const avgWin = wins > 0 ? (totalPnLMoney > 0 ? totalPnLMoney / wins : 0) : 0;
    const avgLoss = losses > 0 ? (totalPnLMoney < 0 ? Math.abs(totalPnLMoney) / losses : 0) : 0;
    const profitFactor = avgLoss > 0 ? avgWin / avgLoss : 0;
    
    // Best/worst trades from individual trades (these are OK to calculate from recent trades)
    const bestTrade = trades.length > 0 
      ? Math.max(...trades.map(t => t.pnl_money || 0))
      : 0;
    
    const worstTrade = trades.length > 0 
      ? Math.min(...trades.map(t => t.pnl_money || 0))
      : 0;

    // Calculate time-based P&L from recent trades (these are supplementary stats)
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const weekStart = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const todayPnL = trades
      .filter(t => new Date(t.created_at) >= todayStart)
      .reduce((sum, trade) => sum + (trade.pnl_money || 0), 0);

    const weekPnL = trades
      .filter(t => new Date(t.created_at) >= weekStart)
      .reduce((sum, trade) => sum + (trade.pnl_money || 0), 0);

    const monthPnL = trades
      .filter(t => new Date(t.created_at) >= monthStart)
      .reduce((sum, trade) => sum + (trade.pnl_money || 0), 0);

    // Use the SAME field as profile page: profile.account_balance
    const currentBalance = profileData?.account_balance || 1000;

    return {
      accountBalance: currentBalance,
      totalPnL: totalPnLMoney, // Use user_stats data (same as profile)
      totalTrades, // Use user_stats data (same as profile)
      winRate, // Use user_stats data (same as profile)
      avgWin,
      avgLoss,
      profitFactor,
      bestTrade,
      worstTrade,
      todayPnL,
      weekPnL,
      monthPnL
    };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <LoadingSpinner size={100} />
        </div>
      </Layout>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <Layout>
      <div className="pb-20 md:pb-8">
        <div className="max-w-7xl mx-auto px-4 py-6">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 flex items-center gap-3">
                  <BarChart2 className="w-8 h-8 text-blue-400" />
                  Dashboard
                </h1>
                <p className="text-gray-400 text-lg">
                  ¡Bienvenido! {user?.email?.split('@')[0]}
                </p>
              </div>
            </div>
          </div>

          {/* Account Balance Card */}
          <div className="mb-8">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm opacity-90 mb-1">Balance de Cuenta</div>
                  <div className="text-4xl font-bold">
                    {formatCurrency(stats?.accountBalance || 0)}
                  </div>
                  <div className="text-sm opacity-90 mt-1">USD</div>
                </div>
                <div className="text-right">
                  <div className="text-sm opacity-90">P&L Total</div>
                  <div className={`text-2xl font-bold ${(stats?.totalPnL || 0) >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                    {stats?.totalPnL ? `${stats.totalPnL > 0 ? '+' : ''}$${stats.totalPnL.toFixed(2)}` : '$0.00'}
                  </div>
                  <div className="text-sm opacity-90">
                    {(stats?.totalPnL || 0) >= 0 ? '+' : ''}{formatPercentage(((stats?.totalPnL || 0) / (stats?.accountBalance || 1000)) * 100)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50">
              <div className="flex items-center gap-2 text-green-400 mb-2">
                <TrendingUp className="w-5 h-5" />
                <span className="text-sm font-medium">Hoy</span>
              </div>
              <div className="text-2xl font-bold text-white">
                {(stats?.todayPnL || 0) >= 0 ? '+' : ''}{formatCurrency(stats?.todayPnL || 0)}
              </div>
              <div className="text-xs text-gray-400">P&L del día</div>
            </div>

            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50">
              <div className="flex items-center gap-2 text-blue-400 mb-2">
                <Calendar className="w-5 h-5" />
                <span className="text-sm font-medium">Semana</span>
              </div>
              <div className="text-2xl font-bold text-white">
                {(stats?.weekPnL || 0) >= 0 ? '+' : ''}{formatCurrency(stats?.weekPnL || 0)}
              </div>
              <div className="text-xs text-gray-400">P&L semanal</div>
            </div>

            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50">
              <div className="flex items-center gap-2 text-purple-400 mb-2">
                <BarChart2 className="w-5 h-5" />
                <span className="text-sm font-medium">Mes</span>
              </div>
              <div className="text-2xl font-bold text-white">
                {(stats?.monthPnL || 0) >= 0 ? '+' : ''}{formatCurrency(stats?.monthPnL || 0)}
              </div>
              <div className="text-xs text-gray-400">P&L mensual</div>
            </div>

            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50">
              <div className="flex items-center gap-2 text-yellow-400 mb-2">
                <Target className="w-5 h-5" />
                <span className="text-sm font-medium">Win Rate</span>
              </div>
              <div className="text-2xl font-bold text-white">
                {formatPercentage(stats?.winRate || 0)}
              </div>
              <div className="text-xs text-gray-400">Tasa de éxito</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Trading Statistics */}
            <div className="lg:col-span-2">
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-green-400" />
                  Estadísticas de Trading
                </h2>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="bg-gray-900/50 rounded-lg p-4">
                    <div className="text-gray-400 text-sm mb-1">Total Trades</div>
                    <div className="text-2xl font-bold text-white">{stats?.totalTrades || 0}</div>
                  </div>

                  <div className="bg-gray-900/50 rounded-lg p-4">
                    <div className="text-gray-400 text-sm mb-1">Ganancia Prom.</div>
                    <div className="text-2xl font-bold text-green-400">
                      {formatCurrency(stats?.avgWin || 0)}
                    </div>
                  </div>

                  <div className="bg-gray-900/50 rounded-lg p-4">
                    <div className="text-gray-400 text-sm mb-1">Pérdida Prom.</div>
                    <div className="text-2xl font-bold text-red-400">
                      {formatCurrency(stats?.avgLoss || 0)}
                    </div>
                  </div>

                  <div className="bg-gray-900/50 rounded-lg p-4">
                    <div className="text-gray-400 text-sm mb-1">Factor Ganancia</div>
                    <div className="text-2xl font-bold text-purple-400">
                      {(stats?.profitFactor || 0).toFixed(2)}
                    </div>
                  </div>

                  <div className="bg-gray-900/50 rounded-lg p-4">
                    <div className="text-gray-400 text-sm mb-1">Mejor Trade</div>
                    <div className="text-2xl font-bold text-green-400">
                      {formatCurrency(stats?.bestTrade || 0)}
                    </div>
                  </div>

                  <div className="bg-gray-900/50 rounded-lg p-4">
                    <div className="text-gray-400 text-sm mb-1">Peor Trade</div>
                    <div className={`text-2xl font-bold ${
                      (stats?.worstTrade || 0) >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {formatCurrency(stats?.worstTrade || 0)}
                    </div>
                  </div>
                </div>

                {/* Mock Chart Placeholder */}
                <div className="mt-6 bg-gray-900/30 rounded-lg p-4 h-64 flex items-center justify-center">
                  <div className="text-center text-gray-400">
                    <LineChart className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>Gráfico de Seguimiento de Cuenta</p>
                    <p className="text-sm">Próximamente disponible</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Trades & Quick Actions */}
            <div className="space-y-6">
              {/* Recent Trades */}
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-400" />
                  Trades Recientes
                </h2>

                <div className="space-y-3">
                  {recentTrades.length > 0 ? (
                    recentTrades.map((trade) => (
                      <div key={trade.id} className="bg-gray-900/50 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${(trade.pnl_percentage || 0) >= 0 ? 'bg-green-400' : 'bg-red-400'}`}></div>
                            <span className="text-white font-medium">{trade.pair || 'N/A'}</span>
                            <span className={`text-xs px-2 py-1 rounded ${(trade.pnl_percentage || 0) >= 0 ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
                              {(trade.pnl_percentage || 0) >= 0 ? 'WIN' : 'LOSS'}
                            </span>
                          </div>
                          <div className="text-right">
                            <div className={`font-bold ${(trade.pnl_percentage || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {(trade.pnl_percentage || 0) >= 0 ? '+' : ''}{formatCurrency(trade.pnl_money || 0)}
                            </div>
                            <div className="text-xs text-gray-400">
                              {(trade.pnl_percentage || 0) >= 0 ? '+' : ''}{formatPercentage(Math.abs(trade.pnl_percentage || 0))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      <BarChart2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No hay trades recientes</p>
                      <p className="text-sm">Comienza a registrar tus trades</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-400" />
                  Acciones Rápidas
                </h2>

                <div className="space-y-3">
                  <button 
                    onClick={() => router.push('/trades')}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <BarChart3 className="w-4 h-4" />
                    Registrar Trade
                  </button>

                  <button 
                    onClick={() => router.push('/lot-calculator')}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white p-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Target className="w-4 h-4" />
                    Calcular Lote
                  </button>

                  <button 
                    onClick={() => router.push('/profit-calendar')}
                    className="w-full bg-green-600 hover:bg-green-700 text-white p-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Calendar className="w-4 h-4" />
                    Ver Calendario
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
} 