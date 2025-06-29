'use client'

import React from 'react'
import { Trophy, TrendingUp, Target, DollarSign, Users, Star, Crown, Medal } from 'lucide-react'

interface LeaderboardEntry {
  id: string
  username: string
  avatar_url?: string
  is_premium: boolean
  total_trades: number
  wins: number
  losses: number
  breakevens: number
  win_rate: number
  total_pnl_percentage: number
  current_balance: number
  total_return_percentage: number
  user_since: string
  pnl_rank?: number
  balance_rank: number
  winrate_rank: number
  volume_rank: number
  group_rank?: number
}

interface LeaderboardCardProps {
  entry: LeaderboardEntry
  rank: number
  isCurrentUser?: boolean
  showGroupRank?: boolean
  className?: string
}

export default function LeaderboardCard({ 
  entry, 
  rank, 
  isCurrentUser = false, 
  showGroupRank = false,
  className = '' 
}: LeaderboardCardProps) {
  // Add null checks and default values
  const safeEntry = {
    username: entry.username || 'Usuario',
    avatar_url: entry.avatar_url || null,
    is_premium: entry.is_premium || false,
    total_trades: entry.total_trades || 0,
    wins: entry.wins || 0,
    losses: entry.losses || 0,
    breakevens: entry.breakevens || 0,
    win_rate: entry.win_rate || 0,
    total_pnl_percentage: entry.total_pnl_percentage || 0,
    current_balance: entry.current_balance || 1000,
    total_return_percentage: entry.total_return_percentage || 0,
    user_since: entry.user_since || new Date().toISOString(),
    pnl_rank: entry.pnl_rank || rank,
    balance_rank: entry.balance_rank || rank,
    winrate_rank: entry.winrate_rank || rank,
    volume_rank: entry.volume_rank || rank,
    group_rank: entry.group_rank || rank
  }

  const getRankIcon = (position: number) => {
    if (position === 1) return <Crown className="w-5 h-5 text-yellow-400" />
    if (position === 2) return <Medal className="w-5 h-5 text-gray-300" />
    if (position === 3) return <Medal className="w-5 h-5 text-amber-600" />
    return <span className="text-gray-400 font-bold text-sm">#{position}</span>
  }

  const getPnlColor = (pnl: number) => {
    if (pnl > 0) return 'text-green-400'
    if (pnl < 0) return 'text-red-400'
    return 'text-gray-400'
  }

  const getWinRateColor = (winRate: number) => {
    if (winRate >= 70) return 'text-green-400'
    if (winRate >= 50) return 'text-yellow-400'
    return 'text-red-400'
  }

  return (
    <div 
      className={`
        bg-gray-800/60 backdrop-blur-sm rounded-lg p-4 border border-gray-700 
        hover:bg-gray-800/80 transition-all duration-200 hover:border-gray-600
        ${isCurrentUser ? 'ring-2 ring-blue-500/30 border-blue-500/50' : ''}
        ${className}
      `}
    >
      <div className="flex items-center space-x-4">
        {/* Ranking y Avatar */}
        <div className="flex items-center space-x-3 flex-shrink-0">
          <div className="flex items-center justify-center w-8 h-8">
            {getRankIcon(rank)}
          </div>
          
          <div className="relative">
            {safeEntry.avatar_url ? (
              <img
                src={safeEntry.avatar_url}
                alt={safeEntry.username}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">
                  {safeEntry.username.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            
            {safeEntry.is_premium && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center">
                <Star className="w-2.5 h-2.5 text-white" />
              </div>
            )}
          </div>
        </div>

        {/* Información principal */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <h3 className="text-white font-semibold text-lg truncate">
                {safeEntry.username}
              </h3>
              {isCurrentUser && (
                <span className="bg-blue-600/20 text-blue-400 text-xs px-2 py-1 rounded">
                  Tú
                </span>
              )}
            </div>
            
            {/* P&L destacado */}
            <div className={`text-right ${getPnlColor(safeEntry.total_return_percentage)}`}>
              <div className="font-bold text-lg">
                {safeEntry.total_return_percentage > 0 ? '+' : ''}
                {safeEntry.total_return_percentage.toFixed(2)}%
              </div>
              <div className="text-xs text-gray-400">P&L</div>
            </div>
          </div>

          {/* Estadísticas compactas */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                <DollarSign className="w-3 h-3 text-gray-400" />
                <span className="text-white font-medium">
                  €{safeEntry.current_balance.toLocaleString()}
                </span>
              </div>
              
              <div className="flex items-center space-x-1">
                <Target className="w-3 h-3 text-gray-400" />
                <span className={`font-medium ${getWinRateColor(safeEntry.win_rate)}`}>
                  {safeEntry.win_rate.toFixed(1)}%
                </span>
              </div>
            </div>
            
            <div className="flex items-center space-x-4 text-gray-400">
              <div className="flex items-center space-x-1">
                <TrendingUp className="w-3 h-3" />
                <span>{safeEntry.total_trades}</span>
              </div>
              
              <div className="text-xs">
                {safeEntry.wins}W/{safeEntry.losses}L
              </div>
            </div>
          </div>

          {/* Fecha de registro */}
          <div className="mt-2 text-xs text-gray-500">
            Desde {new Date(safeEntry.user_since).toLocaleDateString('es-ES', {
              month: 'short',
              year: 'numeric'
            })}
          </div>
        </div>

        {/* Flecha indicadora */}
        <div className="flex-shrink-0">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </div>
  )
} 