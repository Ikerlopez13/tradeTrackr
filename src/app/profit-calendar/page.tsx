'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Layout from '@/components/Layout';
import LoadingSpinner from '@/components/LoadingSpinner';
import ProfitCalendar from '@/components/ProfitCalendar';
import { TrendingUp, TrendingDown, Calendar, Target, DollarSign, BarChart3 } from 'lucide-react';

interface MonthlyStats {
  month: string;
  total_pnl_percentage: number;
  total_pnl_money: number;
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  win_rate: number;
  best_day: number;
  worst_day: number;
}

export default function ProfitCalendarPage() {
  const [loading, setLoading] = useState(true);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats | null>(null);
  const [user, setUser] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState(new Date()); // Fecha seleccionada en el calendario
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
      await loadMonthlyStats(user.id, selectedDate);
      setLoading(false);
    };

    getUser();
  }, [router, supabase.auth]);

  // Cargar estadísticas cuando cambia la fecha seleccionada
  useEffect(() => {
    if (user) {
      loadMonthlyStats(user.id, selectedDate);
    }
  }, [selectedDate, user]);

  // Callback para cuando cambia el mes en el calendario
  const handleMonthChange = (date: Date) => {
    setSelectedDate(date);
  };

  const loadMonthlyStats = async (userId: string, date: Date = new Date()) => {
    try {
      const year = date.getFullYear();
      const month = date.getMonth();
      
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0);
      
      const { data: trades, error } = await supabase
        .from('trades')
        .select('pnl_percentage, pnl_money, result, created_at')
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (error) {
        console.error('Error loading monthly stats:', error);
        return;
      }

      if (!trades || trades.length === 0) {
        setMonthlyStats({
          month: date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }),
          total_pnl_percentage: 0,
          total_pnl_money: 0,
          total_trades: 0,
          winning_trades: 0,
          losing_trades: 0,
          win_rate: 0,
          best_day: 0,
          worst_day: 0
        });
        return;
      }

      // Calculate monthly statistics
      const totalPnlPercentage = trades.reduce((sum, trade) => sum + (trade.pnl_percentage || 0), 0);
      const totalPnlMoney = trades.reduce((sum, trade) => sum + (trade.pnl_money || 0), 0);
      // Usar valores normalizados
      const winningTrades = trades.filter(trade => trade.result === 'win').length;
      const losingTrades = trades.filter(trade => trade.result === 'loss').length;
      const winRate = trades.length > 0 ? (winningTrades / trades.length) * 100 : 0;

      // Calculate best and worst days
      const dailyPnL = new Map<string, number>();
      trades.forEach(trade => {
        const date = new Date(trade.created_at).toDateString();
        if (!dailyPnL.has(date)) {
          dailyPnL.set(date, 0);
        }
        dailyPnL.set(date, dailyPnL.get(date)! + (trade.pnl_percentage || 0));
      });

      const dailyValues = Array.from(dailyPnL.values());
      const bestDay = dailyValues.length > 0 ? Math.max(...dailyValues) : 0;
      const worstDay = dailyValues.length > 0 ? Math.min(...dailyValues) : 0;

      setMonthlyStats({
        month: date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }),
        total_pnl_percentage: totalPnlPercentage,
        total_pnl_money: totalPnlMoney,
        total_trades: trades.length,
        winning_trades: winningTrades,
        losing_trades: losingTrades,
        win_rate: winRate,
        best_day: bestDay,
        worst_day: worstDay
      });
    } catch (error) {
      console.error('Error loading monthly stats:', error);
    }
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
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
              Calendario de Ganancias
            </h1>
            <p className="text-gray-400 text-lg">
              Visualiza tu rendimiento diario y estadísticas mensuales
            </p>
          </div>

          {/* Monthly Stats */}
          {monthlyStats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 hover:bg-gray-800/70 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm font-medium">P&L Total ({monthlyStats.month})</p>
                    <p className={`text-3xl font-bold ${monthlyStats.total_pnl_percentage >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {monthlyStats.total_pnl_percentage > 0 ? '+' : ''}{monthlyStats.total_pnl_percentage.toFixed(2)}%
                    </p>
                  </div>
                  <div className={`p-3 rounded-lg ${monthlyStats.total_pnl_percentage >= 0 ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                    {monthlyStats.total_pnl_percentage >= 0 ? 
                      <TrendingUp className="w-8 h-8 text-green-400" /> : 
                      <TrendingDown className="w-8 h-8 text-red-400" />
                    }
                  </div>
                </div>
              </div>

              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 hover:bg-gray-800/70 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm font-medium">Dinero Total</p>
                    <p className={`text-3xl font-bold ${monthlyStats.total_pnl_money >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {monthlyStats.total_pnl_money > 0 ? '+' : ''}${monthlyStats.total_pnl_money.toFixed(2)}
                    </p>
                  </div>
                  <div className="p-3 bg-blue-500/20 rounded-lg">
                    <DollarSign className="w-8 h-8 text-blue-400" />
                  </div>
                </div>
              </div>

              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 hover:bg-gray-800/70 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm font-medium">Win Rate</p>
                    <p className="text-3xl font-bold text-purple-400">{monthlyStats.win_rate.toFixed(1)}%</p>
                  </div>
                  <div className="p-3 bg-purple-500/20 rounded-lg">
                    <Target className="w-8 h-8 text-purple-400" />
                  </div>
                </div>
              </div>

              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 hover:bg-gray-800/70 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm font-medium">Total Trades</p>
                    <p className="text-3xl font-bold text-yellow-400">{monthlyStats.total_trades}</p>
                  </div>
                  <div className="p-3 bg-yellow-500/20 rounded-lg">
                    <BarChart3 className="w-8 h-8 text-yellow-400" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Profit Calendar */}
          <div className="mb-8">
            <ProfitCalendar onMonthChange={handleMonthChange} />
          </div>

          {/* Additional Stats */}
          {monthlyStats && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-400" />
                  Mejor Día
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">P&L Porcentaje:</span>
                    <span className="text-2xl font-bold text-green-400">
                      +{monthlyStats.best_day.toFixed(2)}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-red-400" />
                  Peor Día
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">P&L Porcentaje:</span>
                    <span className="text-2xl font-bold text-red-400">
                      {monthlyStats.worst_day.toFixed(2)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
} 