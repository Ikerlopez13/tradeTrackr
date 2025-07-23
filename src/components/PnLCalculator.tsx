'use client';

import { useState, useEffect } from 'react';
import { Calculator, DollarSign, Percent, TrendingUp, TrendingDown } from 'lucide-react';

interface PnLCalculatorProps {
  accountBalance: number;
  pnl_money: string;
  pnl_percentage: string;
  onPnLChange: (money: string, percentage: string) => void;
  className?: string;
}

export default function PnLCalculator({ 
  accountBalance, 
  pnl_money, 
  pnl_percentage, 
  onPnLChange,
  className = '' 
}: PnLCalculatorProps) {
  
  // Función para calcular P&L automáticamente
  const calculatePnL = (field: 'money' | 'percentage', value: string) => {
    const numValue = parseFloat(value) || 0;
    
    if (field === 'money' && value !== '') {
      // Calcular porcentaje basado en dinero
      const percentage = (numValue / accountBalance) * 100;
      const formattedPercentage = percentage.toFixed(4);
      onPnLChange(value, formattedPercentage);
    } else if (field === 'percentage' && value !== '') {
      // Calcular dinero basado en porcentaje  
      const money = (accountBalance * numValue) / 100;
      const formattedMoney = money.toFixed(2);
      onPnLChange(formattedMoney, value);
    } else {
      // Si se borra el campo, solo actualizar ese campo
      if (field === 'money') {
        onPnLChange(value, pnl_percentage);
      } else {
        onPnLChange(pnl_money, value);
      }
    }
  };

  // Determinar el color y el icono basado en los valores
  const getPnLStatus = () => {
    const moneyValue = parseFloat(pnl_money) || 0;
    const percentageValue = parseFloat(pnl_percentage) || 0;
    
    if (moneyValue > 0 || percentageValue > 0) {
      return { color: 'text-green-400', bgColor: 'bg-green-500/10', icon: TrendingUp };
    } else if (moneyValue < 0 || percentageValue < 0) {
      return { color: 'text-red-400', bgColor: 'bg-red-500/10', icon: TrendingDown };
    }
    return { color: 'text-gray-400', bgColor: 'bg-gray-800', icon: Calculator };
  };

  const status = getPnLStatus();
  const StatusIcon = status.icon;

  return (
    <div className={`${className}`}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* P&L Dinero */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            P&L Dinero ($) *
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <DollarSign className={`w-4 h-4 ${status.color}`} />
            </div>
            <input
              type="number"
              step="0.01"
              value={pnl_money}
              onChange={(e) => calculatePnL('money', e.target.value)}
              className={`w-full pl-10 pr-4 py-3 ${status.bgColor} border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all`}
              placeholder="25.50"
            />
          </div>
        </div>

        {/* P&L Porcentaje */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            P&L Porcentaje (%)
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Percent className={`w-4 h-4 ${status.color}`} />
            </div>
            <input
              type="number"
              step="0.01"
              value={pnl_percentage}
              onChange={(e) => calculatePnL('percentage', e.target.value)}
              className={`w-full pl-10 pr-4 py-3 ${status.bgColor} border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all`}
              placeholder="2.55"
            />
          </div>
        </div>
      </div>

      {/* Indicador de cálculo automático */}
      {(pnl_money || pnl_percentage) && (
        <div className={`mt-3 p-3 rounded-lg ${status.bgColor} border border-gray-700`}>
          <div className="flex items-center gap-2">
            <StatusIcon className={`w-4 h-4 ${status.color}`} />
            <span className={`text-sm ${status.color} font-medium`}>
              {parseFloat(pnl_money) > 0 || parseFloat(pnl_percentage) > 0 ? 'Ganancia' : 'Pérdida'}
            </span>
            <span className="text-gray-400 text-sm">
              • Balance: ${accountBalance.toLocaleString()}
            </span>
          </div>
          
          {pnl_money && pnl_percentage && (
            <div className="mt-2 text-xs text-gray-400">
              <div className="flex justify-between">
                <span>Dinero:</span>
                <span className={status.color}>
                  {parseFloat(pnl_money) >= 0 ? '+' : ''}${Math.abs(parseFloat(pnl_money)).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Porcentaje:</span>
                <span className={status.color}>
                  {parseFloat(pnl_percentage) >= 0 ? '+' : ''}{Math.abs(parseFloat(pnl_percentage)).toFixed(4)}%
                </span>
              </div>
              <div className="flex justify-between mt-1 pt-1 border-t border-gray-600">
                <span>Nuevo balance:</span>
                <span className="text-white font-medium">
                  ${(accountBalance + parseFloat(pnl_money || '0')).toLocaleString()}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 