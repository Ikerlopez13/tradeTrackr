'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Calendar as CalendarIcon } from 'lucide-react';

interface DailyPnL {
  date: string;
  pnl_percentage: number;
  pnl_money: number;
  trades_count: number;
  win_rate: number;
}

interface ProfitCalendarProps {
  className?: string;
  onMonthChange?: (date: Date) => void;
}

export default function ProfitCalendar({ className = '', onMonthChange }: ProfitCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dailyData, setDailyData] = useState<DailyPnL[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<DailyPnL | null>(null);

  const supabase = createClient();

  // Notificar la fecha inicial cuando se monta el componente
  useEffect(() => {
    if (onMonthChange) {
      onMonthChange(currentDate);
    }
  }, [onMonthChange]); // Solo se ejecuta cuando se monta o cambia onMonthChange

  useEffect(() => {
    loadMonthlyData();
    // Notificar al componente padre cuando cambia el mes
    if (onMonthChange) {
      onMonthChange(currentDate);
    }
  }, [currentDate, onMonthChange]);

  const loadMonthlyData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0);
      
      const { data: trades, error } = await supabase
        .from('trades')
        .select('created_at, pnl_percentage, pnl_money, result')
        .eq('user_id', user.id)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading trades:', error);
        return;
      }

      // Group trades by day
      const dailyMap = new Map<string, DailyPnL>();
      
      trades?.forEach(trade => {
        const date = new Date(trade.created_at).toDateString();
        
        if (!dailyMap.has(date)) {
          dailyMap.set(date, {
            date,
            pnl_percentage: 0,
            pnl_money: 0,
            trades_count: 0,
            win_rate: 0
          });
        }
        
        const dayData = dailyMap.get(date)!;
        dayData.pnl_percentage += trade.pnl_percentage || 0;
        dayData.pnl_money += trade.pnl_money || 0;
        dayData.trades_count += 1;
        
        // Count winning trades (usando valores normalizados)
        if (trade.result === 'win') {
          dayData.win_rate += 1;
        }
      });

      // Calculate win rates as percentages
      dailyMap.forEach(dayData => {
        dayData.win_rate = dayData.trades_count > 0 ? (dayData.win_rate / dayData.trades_count) * 100 : 0;
      });

      setDailyData(Array.from(dailyMap.values()));
    } catch (error) {
      console.error('Error loading monthly data:', error);
    } finally {
      setLoading(false);
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }
    
    return days;
  };

  const getDayData = (day: number) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    return dailyData.find(d => new Date(d.date).toDateString() === date.toDateString());
  };

  const getPnLColor = (pnl: number) => {
    if (pnl > 0) return 'bg-green-500/20 text-green-400 border-green-500/30';
    if (pnl < 0) return 'bg-red-500/20 text-red-400 border-red-500/30';
    return 'bg-gray-600/20 text-gray-400 border-gray-600/30';
  };

  const getPnLIntensity = (pnl: number) => {
    const absValue = Math.abs(pnl);
    // Ajustar los rangos para dinero en lugar de porcentaje
    if (absValue >= 100) return 'opacity-100'; // $100+
    if (absValue >= 50) return 'opacity-80';   // $50-$99
    if (absValue >= 25) return 'opacity-60';   // $25-$49
    if (absValue >= 10) return 'opacity-40';   // $10-$24
    return 'opacity-30'; // Menos de $10
  };

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  return (
    <div className={`bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-blue-400" />
          Calendario de Ganancias
        </h2>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigateMonth('prev')}
            className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-gray-400" />
          </button>
          <span className="text-lg font-semibold text-white min-w-[140px] text-center">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </span>
          <button
            onClick={() => navigateMonth('next')}
            className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1 mb-4">
        {/* Day headers */}
        {dayNames.map(day => (
          <div key={day} className="text-center text-sm font-medium text-gray-400 py-2">
            {day}
          </div>
        ))}
        
        {/* Calendar days */}
        {getDaysInMonth().map((day, index) => {
          if (!day) {
            return <div key={`empty-${index}`} className="aspect-square" />;
          }
          
          const dayData = getDayData(day);
          const pnl = dayData?.pnl_money || 0; // CAMBIAR: usar dinero en lugar de porcentaje
          const isToday = new Date().toDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString();
          
          return (
            <div
              key={`day-${currentDate.getMonth()}-${day}`}
              className={`aspect-square flex flex-col items-center justify-center rounded-lg border cursor-pointer transition-all hover:scale-105 ${
                dayData 
                  ? `${getPnLColor(pnl)} ${getPnLIntensity(pnl)}`
                  : 'bg-gray-700/30 border-gray-600/30 text-gray-500'
              } ${isToday ? 'ring-2 ring-blue-400' : ''}`}
              onClick={() => dayData && setSelectedDay(dayData)}
            >
              <span className="text-xs font-medium">{day}</span>
              {dayData && (
                <>
                  <span className="text-xs font-bold">
                    {pnl > 0 ? '+' : ''}${Math.abs(pnl).toFixed(0)} {/* CAMBIAR: mostrar dinero */}
                  </span>
                  <span className="text-xs opacity-75">
                    {dayData.trades_count}
                  </span>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between text-xs text-gray-400 border-t border-gray-700/50 pt-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-500/20 border border-green-500/30 rounded"></div>
            <span>Ganancia</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-red-500/20 border border-red-500/30 rounded"></div>
            <span>Pérdida</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-gray-600/20 border border-gray-600/30 rounded"></div>
            <span>Sin trades</span>
          </div>
        </div>
        <div className="text-right">
          <span>Intensidad basada en $ de ganancia/pérdida</span>
        </div>
      </div>

      {/* Day Details Modal */}
      {selectedDay && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">
                {new Date(selectedDay.date).toLocaleDateString('es-ES', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </h3>
              <button
                onClick={() => setSelectedDay(null)}
                className="text-gray-400 hover:text-white"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">P&L Dinero:</span>
                <span className={`font-bold ${selectedDay.pnl_money >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {selectedDay.pnl_money > 0 ? '+' : ''}${selectedDay.pnl_money.toFixed(2)}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-400">P&L Porcentaje:</span>
                <span className={`font-bold ${selectedDay.pnl_percentage >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {selectedDay.pnl_percentage > 0 ? '+' : ''}{selectedDay.pnl_percentage.toFixed(2)}%
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Trades:</span>
                <span className="text-white font-medium">{selectedDay.trades_count}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Win Rate:</span>
                <span className="text-white font-medium">{selectedDay.win_rate.toFixed(1)}%</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 