'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Globe, Users, Plus, Search, Filter, Trophy, Crown, Medal, DollarSign, TrendingUp } from 'lucide-react'
import LeaderboardCard from './LeaderboardCard'
import GroupCard from './GroupCard'
import CreateGroupModal from './CreateGroupModal'
import JoinGroupModal from './JoinGroupModal'

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

interface Group {
  id: string
  name: string
  description?: string
  created_by: string
  invite_code: string
  is_public: boolean
  max_members: number
  member_count: number
  created_at: string
}

export default function LeaderboardsView() {
  const [activeTab, setActiveTab] = useState<'global' | 'groups'>('global')
  const [globalLeaderboard, setGlobalLeaderboard] = useState<LeaderboardEntry[]>([])
  const [userGroups, setUserGroups] = useState<Group[]>([])
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null)
  const [groupLeaderboard, setGroupLeaderboard] = useState<LeaderboardEntry[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [showJoinGroup, setShowJoinGroup] = useState(false)
  const [sortBy, setSortBy] = useState<'pnl' | 'balance' | 'winrate' | 'volume'>('pnl')
  const [searchTerm, setSearchTerm] = useState('')
  const [isPremium, setIsPremium] = useState(false)

  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (selectedGroup) {
      loadGroupLeaderboard(selectedGroup)
    }
  }, [selectedGroup])

  const loadData = async () => {
    try {
      setLoading(true)
      
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUser(user)

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_premium')
          .eq('id', user.id)
          .single()
        
        setIsPremium(profile?.is_premium || false)
      }

      await loadGlobalLeaderboard()

      if (user) {
        await loadUserGroups(user.id)
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadGlobalLeaderboard = async () => {
    try {
      const { data, error } = await supabase
        .from('global_leaderboard')
        .select('*')
        .order(
          sortBy === 'pnl' ? 'total_return_percentage' :
          sortBy === 'balance' ? 'current_balance' : 
          sortBy === 'winrate' ? 'win_rate' : 'total_trades', 
          { ascending: false }
        )
        .limit(50)

      if (error) throw error
      setGlobalLeaderboard(data || [])
    } catch (error) {
      console.error('Error loading global leaderboard:', error)
    }
  }

  const loadUserGroups = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('group_memberships')
        .select(`
          group_id,
          friend_groups (
            id,
            name,
            description,
            created_by,
            invite_code,
            is_public,
            max_members,
            created_at
          )
        `)
        .eq('user_id', userId)

      if (error) throw error

      const groups = data?.map(item => ({
        ...(item.friend_groups as any),
        member_count: 0
      })).filter(group => group.id) || []

      const groupsWithCounts = await Promise.all(
        groups.map(async (group) => {
          const { count } = await supabase
            .from('group_memberships')
            .select('*', { count: 'exact', head: true })
            .eq('group_id', group.id)

          return { ...group, member_count: count || 0 }
        })
      )

      setUserGroups(groupsWithCounts)

      if (groupsWithCounts.length > 0 && !selectedGroup) {
        setSelectedGroup(groupsWithCounts[0].id)
      }
    } catch (error) {
      console.error('Error loading user groups:', error)
    }
  }

  const loadGroupLeaderboard = async (groupId: string) => {
    try {
      const { data, error } = await supabase
        .from('group_leaderboard')
        .select('*')
        .eq('group_id', groupId)
        .order('total_return_percentage', { ascending: false })

      if (error) throw error
      setGroupLeaderboard(data || [])
    } catch (error) {
      console.error('Error loading group leaderboard:', error)
    }
  }

  const handleLeaveGroup = (groupId: string) => {
    setUserGroups(prev => prev.filter(group => group.id !== groupId))
    if (selectedGroup === groupId) {
      setSelectedGroup(userGroups.length > 1 ? userGroups[0].id : null)
    }
  }

  const handleRestoreGroups = async () => {
    if (currentUser) {
      await loadUserGroups(currentUser.id)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const filteredGlobalLeaderboard = globalLeaderboard.filter(entry =>
    entry.username.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredGroupLeaderboard = groupLeaderboard.filter(entry =>
    entry.username.toLowerCase().includes(searchTerm.toLowerCase())
  )

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

  return (
    <div className="min-h-screen" style={{backgroundColor: '#010314'}}>
      {/* Header móvil */}
      <header className="md:hidden sticky top-0 z-50 backdrop-blur-sm border-b border-gray-800" style={{backgroundColor: '#010314'}}>
        <div className="flex items-center justify-center py-4 px-6">
          <Image
            src="/logo.jpeg"
            alt="TradeTrackr Logo"
            width={32}
            height={32}
            priority
            unoptimized
            className="rounded-lg mr-3"
          />
          <h1 className="text-lg font-bold text-white">TradeTrackr</h1>
        </div>
      </header>

      {/* Navbar desktop */}
      <nav className="hidden md:flex items-center justify-between px-8 py-4 backdrop-blur-sm border-b border-gray-800" style={{backgroundColor: '#010314'}}>
        <div className="flex items-center">
          <Image
            src="/logo.jpeg"
            alt="TradeTrackr Logo"
            width={40}
            height={40}
            priority
            unoptimized
            className="rounded-lg mr-4"
          />
          <h1 className="text-2xl font-bold text-white">TradeTrackr</h1>
        </div>
        
        <div className="flex items-center space-x-6">
          <Link
            href="/"
            className="text-gray-400 font-medium hover:text-white transition-colors"
          >
            Nuevo Trade
          </Link>
          <Link
            href="/trades"
            className="text-gray-400 font-medium hover:text-white transition-colors"
          >
            Mis Trades
          </Link>
          <Link
            href="/referrals"
            className="text-gray-400 font-medium hover:text-white transition-colors"
          >
            Referidos
          </Link>
          {!isPremium ? (
            <Link
              href="/pricing"
              className="text-gray-400 font-medium hover:text-white transition-colors"
            >
              Pricing
            </Link>
          ) : (
            <Link
              href="/subscription"
              className="text-gray-400 font-medium hover:text-white transition-colors"
            >
              Suscripción
            </Link>
          )}
          <Link
            href="/profile"
            className="text-gray-400 font-medium hover:text-white transition-colors"
          >
            Perfil
          </Link>
          <Link
            href="/leaderboards"
            className="bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-400 border border-yellow-500/30 px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
          >
            <Trophy className="w-4 h-4" />
            <span>Leaderboards</span>
          </Link>
          <button
            onClick={handleLogout}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Cerrar Sesión
          </button>
        </div>
      </nav>

      {/* Contenido principal */}
      <div className="pb-20 md:pb-8">
        <div className="max-w-2xl mx-auto px-4 py-6">
          {/* Título y controles */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <Trophy className="w-6 h-6 text-yellow-400" />
              <h1 className="text-xl md:text-2xl font-bold text-white">
                Leaderboards
              </h1>
            </div>
            
            {activeTab === 'groups' && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowJoinGroup(true)}
                  className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  <Search className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowCreateGroup(true)}
                  className="bg-green-600/20 hover:bg-green-600/30 text-green-400 border border-green-500/30 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="flex space-x-1 bg-gray-800/50 rounded-lg p-1 mb-4">
            <button
              onClick={() => setActiveTab('global')}
              className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'global'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
              }`}
            >
              <Globe className="w-4 h-4" />
              <span>Global</span>
            </button>
            <button
              onClick={() => setActiveTab('groups')}
              className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'groups'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Grupos ({userGroups.length})</span>
            </button>
          </div>

          {/* Filtros */}
          {activeTab === 'global' && (
            <div className="flex flex-wrap gap-2 mb-4">
              <button
                onClick={() => {setSortBy('pnl'); loadGlobalLeaderboard()}}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1 ${
                  sortBy === 'pnl' 
                    ? 'bg-green-600 text-white' 
                    : 'bg-gray-800/50 text-gray-400 hover:text-white hover:bg-gray-700/50'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                <span>P&L %</span>
              </button>
              <button
                onClick={() => {setSortBy('balance'); loadGlobalLeaderboard()}}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1 ${
                  sortBy === 'balance' 
                    ? 'bg-yellow-600 text-white' 
                    : 'bg-gray-800/50 text-gray-400 hover:text-white hover:bg-gray-700/50'
                }`}
              >
                <DollarSign className="w-4 h-4" />
                <span>Balance</span>
              </button>
              <button
                onClick={() => {setSortBy('winrate'); loadGlobalLeaderboard()}}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1 ${
                  sortBy === 'winrate' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-800/50 text-gray-400 hover:text-white hover:bg-gray-700/50'
                }`}
              >
                <Trophy className="w-4 h-4" />
                <span>Win Rate</span>
              </button>
              <button
                onClick={() => {setSortBy('volume'); loadGlobalLeaderboard()}}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1 ${
                  sortBy === 'volume' 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-gray-800/50 text-gray-400 hover:text-white hover:bg-gray-700/50'
                }`}
              >
                <Filter className="w-4 h-4" />
                <span>Volumen</span>
              </button>
            </div>
          )}

          {/* Búsqueda */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar usuario..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-800/60 border border-gray-700 text-white rounded-lg pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Contenido de leaderboards */}
          {activeTab === 'global' ? (
            <div className="space-y-4">
              {filteredGlobalLeaderboard.length > 0 ? (
                filteredGlobalLeaderboard.map((entry, index) => (
                  <LeaderboardCard
                    key={entry.id}
                    entry={entry}
                    rank={index + 1}
                    isCurrentUser={entry.id === currentUser?.id}
                    className={index < 3 ? 'border-2 border-yellow-500/30' : ''}
                  />
                ))
              ) : (
                <div className="text-center py-12">
                  <Trophy className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-white text-lg font-medium mb-2">
                    No hay datos disponibles
                  </h3>
                  <p className="text-gray-400">
                    Los leaderboards se actualizan cuando los usuarios registran trades
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {userGroups.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-white text-lg font-medium mb-2">
                    No tienes grupos aún
                  </h3>
                  <p className="text-gray-400 mb-6">
                    Crea un grupo o únete a uno existente para competir con tus amigos
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                      onClick={() => setShowCreateGroup(true)}
                      className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
                    >
                      <Plus className="w-5 h-5" />
                      <span>Crear Grupo</span>
                    </button>
                    <button
                      onClick={() => setShowJoinGroup(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
                    >
                      <Search className="w-5 h-5" />
                      <span>Unirse a Grupo</span>
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Selector de grupo */}
                  <div className="mb-4">
                    <select
                      value={selectedGroup || ''}
                      onChange={(e) => setSelectedGroup(e.target.value)}
                      className="w-full bg-gray-800/60 border border-gray-700 text-white rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {userGroups.map(group => (
                        <option key={group.id} value={group.id}>
                          {group.name} ({group.member_count} miembros)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Leaderboard del grupo */}
                  {selectedGroup && (
                    <div className="space-y-4">
                      {filteredGroupLeaderboard.length > 0 ? (
                        filteredGroupLeaderboard.map((entry, index) => (
                          <LeaderboardCard
                            key={entry.id}
                            entry={entry}
                            rank={index + 1}
                            isCurrentUser={entry.id === currentUser?.id}
                            showGroupRank={true}
                          />
                        ))
                      ) : (
                        <div className="text-center py-8">
                          <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                          <p className="text-gray-400">
                            No hay datos de trading en este grupo aún
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Navigation - Solo móvil */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 backdrop-blur-sm border-t border-gray-800 z-50" style={{backgroundColor: '#010314'}}>
        <div className="flex justify-around items-center py-2">
          <Link
            href="/"
            className="flex flex-col items-center py-1 px-2 text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5 mb-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            <span className="text-xs font-medium">Nuevo</span>
          </Link>

          <Link
            href="/trades"
            className="flex flex-col items-center py-1 px-2 text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span className="text-xs font-medium">Trades</span>
          </Link>

          <Link
            href="/referrals"
            className="flex flex-col items-center py-1 px-2 text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span className="text-xs font-medium">Referidos</span>
          </Link>

          <Link
            href="/leaderboards"
            className="flex flex-col items-center py-1 px-2 text-yellow-400"
          >
            <Trophy className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium">Ranking</span>
          </Link>

          {!isPremium ? (
            <Link
              href="/pricing"
              className="flex flex-col items-center py-1 px-2 text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
              <span className="text-xs font-medium">Pricing</span>
            </Link>
          ) : (
            <Link
              href="/subscription"
              className="flex flex-col items-center py-1 px-2 text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
              <span className="text-xs font-medium">Suscripción</span>
            </Link>
          )}

          <Link
            href="/profile"
            className="flex flex-col items-center py-1 px-2 text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-xs font-medium">Perfil</span>
          </Link>
        </div>
      </nav>

      {/* Modales */}
      {showCreateGroup && (
        <CreateGroupModal
          onClose={() => setShowCreateGroup(false)}
          onSuccess={() => {
            setShowCreateGroup(false)
            if (currentUser) loadUserGroups(currentUser.id)
          }}
        />
      )}

      {showJoinGroup && (
        <JoinGroupModal
          onClose={() => setShowJoinGroup(false)}
          onSuccess={() => {
            setShowJoinGroup(false)
            if (currentUser) loadUserGroups(currentUser.id)
          }}
        />
      )}
    </div>
  )
} 