'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { AlertCircle, Calendar, DollarSign } from 'lucide-react';

interface DebugTradesInfoProps {
  userId: string;
}

export default function DebugTradesInfo({ userId }: DebugTradesInfoProps) {
  const [allTrades, setAllTrades] = useState<any[]>([]);
  const [recentTrades, setRecentTrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    if (userId) {
      loadDebugData();
    }
  }, [userId]);

  const loadDebugData = async () => {
    try {
      setLoading(true);

      // Obtener TODOS los trades
      const { data: allTradesData, error: allError } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      // Obtener trades de los últimos 30 días
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: recentTradesData, error: recentError } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: false });

      if (allError) console.error('Error loading all trades:', allError);
      if (recentError) console.error('Error loading recent trades:', recentError);

      setAllTrades(allTradesData || []);
      setRecentTrades(recentTradesData || []);

      console.log('🔍 DEBUG COMPLETO:');
      console.log('Total trades:', allTradesData?.length || 0);
      console.log('Trades últimos 30 días:', recentTradesData?.length || 0);
      console.log('Fecha límite 30 días:', thirtyDaysAgo.toISOString());
      
      if (recentTradesData && recentTradesData.length > 0) {
        console.log('Primer trade reciente:', recentTradesData[0]);
        console.log('Último trade reciente:', recentTradesData[recentTradesData.length - 1]);
      }

    } catch (error) {
      console.error('Error in debug component:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-red-900/20 border border-red-600/30 rounded-lg p-4 text-red-300">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          <span>Cargando información de debug...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-red-900/20 border border-red-600/30 rounded-lg p-4 text-red-300 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <AlertCircle className="w-5 h-5" />
        <span className="font-bold">DEBUG: Información de Trades</span>
      </div>
      
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          <span>Total trades en BD: <strong>{allTrades.length}</strong></span>
        </div>
        
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4" />
          <span>Trades últimos 30 días: <strong>{recentTrades.length}</strong></span>
        </div>

        <div className="mt-3 p-2 bg-red-800/20 rounded">
          <div className="text-xs">Usuario ID: {userId}</div>
          {recentTrades.length > 0 && (
            <>
              <div className="text-xs mt-1">Último trade: {new Date(recentTrades[0].created_at).toLocaleString()}</div>
              <div className="text-xs">Primer trade: {new Date(recentTrades[recentTrades.length - 1].created_at).toLocaleString()}</div>
            </>
          )}
        </div>

        {recentTrades.length === 0 && allTrades.length > 0 && (
          <div className="mt-2 p-2 bg-yellow-900/20 border border-yellow-600/30 rounded text-yellow-300">
            ⚠️ Tienes {allTrades.length} trades pero ninguno en los últimos 30 días
          </div>
        )}

        {allTrades.length === 0 && (
          <div className="mt-2 p-2 bg-gray-800/20 rounded text-gray-400">
            No hay trades en la base de datos
          </div>
        )}
      </div>
    </div>
  );
} 