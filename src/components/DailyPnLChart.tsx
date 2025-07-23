'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';

interface DailyPnLData {
  date: string;
  pnl_money: number;
  pnl_percentage: number;
  trades_count: number;
}

interface DailyPnLChartProps {
  userId: string;
  days?: number; // Número de días a mostrar (default: 30)
  className?: string;
}

export default function DailyPnLChart({ userId, days = 30, className = '' }: DailyPnLChartProps) {
  const [dailyData, setDailyData] = useState<DailyPnLData[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPnL, setTotalPnL] = useState(0);

  const supabase = createClient();

  useEffect(() => {
    if (userId) {
      loadDailyPnLData();
    }
  }, [userId, days]);

  const loadDailyPnLData = async () => {
    try {
      setLoading(true);
      
      // Calcular fechas
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Obtener trades del período
      const { data: trades, error } = await supabase
        .from('trades')
        .select('created_at, pnl_percentage, pnl_money, result')
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading daily P&L data:', error);
        return;
      }

      // Agrupar trades por día
      const dailyMap = new Map<string, DailyPnLData>();
      
      // Inicializar todos los días con 0
      for (let i = 0; i < days; i++) {
        const date = new Date();
        date.setDate(date.getDate() - (days - 1 - i));
        const dateStr = date.toISOString().split('T')[0];
        
        dailyMap.set(dateStr, {
          date: dateStr,
          pnl_money: 0,
          pnl_percentage: 0,
          trades_count: 0
        });
      }

      // Agregar datos de trades - PRIORIZAR DINERO
      trades?.forEach(trade => {
        const dateStr = new Date(trade.created_at).toISOString().split('T')[0];
        
        if (dailyMap.has(dateStr)) {
          const dayData = dailyMap.get(dateStr)!;
          // Usar pnl_money como fuente principal
          dayData.pnl_money += trade.pnl_money || 0;
          dayData.pnl_percentage += trade.pnl_percentage || 0;
          dayData.trades_count += 1;
        }
      });

      const dailyArray = Array.from(dailyMap.values());
      setDailyData(dailyArray);
      
      // Calcular P&L total del período
      const total = dailyArray.reduce((sum, day) => sum + day.pnl_money, 0);
      setTotalPnL(total);

    } catch (error) {
      console.error('Error loading daily P&L data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMaxValue = () => {
    const values = dailyData.map(d => Math.abs(d.pnl_money)); // Usar dinero en lugar de porcentaje
    return Math.max(...values, 1); // Mínimo 1 para evitar división por 0
  };

  const getBarHeight = (value: number) => {
    const maxValue = getMaxValue();
    const percentage = Math.abs(value) / maxValue * 100;
    
    // Asegurar que las barras con datos siempre sean visibles
    if (value !== 0) {
      return Math.max(percentage, 25); // Mínimo 25% de altura para barras con datos
    }
    return 0;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', { 
      day: '2-digit', 
      month: '2-digit' 
    });
  };

  if (loading) {
    return (
      <div className={`bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-700 rounded mb-4 w-1/3"></div>
          <div className="h-40 bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-400" />
            P&L Diario
          </h3>
          <p className="text-gray-400 text-sm">
            Últimos {days} días • {dailyData.filter(d => d.trades_count > 0).length} días con trades
          </p>
        </div>
        <div className="text-right">
          <div className={`text-2xl font-bold ${totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {totalPnL >= 0 ? '+' : ''}{formatCurrency(totalPnL)}
          </div>
          <div className="text-gray-400 text-sm flex items-center gap-1">
            {totalPnL >= 0 ? 
              <TrendingUp className="w-4 h-4" /> : 
              <TrendingDown className="w-4 h-4" />
            }
            Total período
          </div>
        </div>
      </div>

      {/* Debug info */}
      {false && process.env.NODE_ENV === 'development' && (
        <div className="mb-4 p-3 bg-yellow-900/20 border border-yellow-600/30 rounded-lg text-yellow-300 text-xs">
          <div>📊 Debug Info:</div>
          <div>• Días con trades: {dailyData.filter(d => d.trades_count > 0).length}</div>
          <div>• Total días: {dailyData.length}</div>
          <div>• Usuario ID: {userId}</div>
          <div>• Max valor: {getMaxValue()}</div>
        </div>
      )}

      {/* Chart */}
      <div className="relative">
        {/* Grid lines */}
        <div className="absolute inset-0 flex flex-col justify-between opacity-20">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="border-t border-gray-600"></div>
          ))}
        </div>

        {/* Bars container - ARREGLADO */}
        <div className="relative h-40 flex items-center justify-center gap-1 px-4">
          <div className="flex items-center justify-between w-full max-w-full gap-1">
            {dailyData.map((day, index) => {
              const maxValue = getMaxValue();
              const normalizedHeight = maxValue > 0 ? (Math.abs(day.pnl_money) / maxValue) * 35 : 0;
              const height = day.trades_count > 0 ? Math.max(normalizedHeight, 15) : 2;
              const isPositive = day.pnl_money > 0;
              const isNegative = day.pnl_money < 0;
              const hasData = day.trades_count > 0;
              
              return (
                <div key={day.date} className="flex flex-col items-center group relative h-full flex-1 max-w-[20px]">
                  {/* Espacio superior para barras positivas */}
                  <div className="flex-1 flex items-end justify-center w-full">
                    {isPositive && hasData && (
                      <div 
                        className="w-4 bg-gradient-to-t from-green-600 to-green-400 border border-green-300 shadow-lg rounded-t transition-all duration-300 hover:scale-105 cursor-pointer"
                        style={{ height: `${height}%` }}
                      />
                    )}
                  </div>

                  {/* Línea central de cero */}
                  <div className="h-px bg-gray-500 w-4 opacity-50"></div>
                  
                  {/* Espacio inferior para barras negativas */}
                  <div className="flex-1 flex items-start justify-center w-full">
                    {isNegative && hasData && (
                      <div 
                        className="w-4 bg-gradient-to-b from-red-600 to-red-400 border border-red-300 shadow-lg rounded-b transition-all duration-300 hover:scale-105 cursor-pointer"
                        style={{ height: `${height}%` }}
                      />
                    )}
                    {!hasData && (
                      <div className="w-4 h-1 bg-gray-600/20 rounded"></div>
                    )}
                  </div>

                  {/* Tooltip */}
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap border border-gray-700 shadow-lg">
                      <div className="font-medium">{formatDate(day.date)}</div>
                      {hasData ? (
                        <>
                          <div className={`font-bold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                            {day.pnl_money >= 0 ? '+' : ''}{formatCurrency(day.pnl_money)}
                          </div>
                          <div className="text-gray-400">
                            {day.trades_count} trade{day.trades_count > 1 ? 's' : ''}
                          </div>
                        </>
                      ) : (
                        <div className="text-gray-400">Sin trades</div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Zero line - CENTRADA */}
        <div className="absolute top-1/2 left-0 right-0 border-t border-gray-500 opacity-50"></div>
      </div>

      {/* Date labels (only show some to avoid crowding) */}
      <div className="flex justify-between mt-2 text-xs text-gray-400 px-2">
        {dailyData.map((day, index) => (
          <div key={day.date} className={`${index % Math.ceil(dailyData.length / 6) !== 0 ? 'opacity-0' : ''}`}>
            {formatDate(day.date)}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded"></div>
          <span className="text-gray-400">Ganancia</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500 rounded"></div>
          <span className="text-gray-400">Pérdida</span>
        </div>
      </div>
    </div>
  );
} 