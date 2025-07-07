'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import { 
  Home, 
  BarChart3, 
  TrendingUp, 
  Trophy, 
  User, 
  LogOut,
  Star,
  Users,
  Gift,
  CreditCard,
  Calendar,
  Calculator,
  DollarSign,
  BookOpen,
  BarChart2
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface SidebarProps {
  user?: any
  profile?: any
}

export default function Sidebar({ user, profile }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const isPremium = profile?.is_premium || false

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      router.push('/login')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const menuItems = [
    {
      icon: BarChart2,
      label: 'Dashboard',
      href: '/dashboard',
      active: pathname === '/dashboard'
    },
    {
      icon: BookOpen,
      label: 'Journaling',
      href: '/',
      active: pathname === '/'
    },
    {
      icon: Calculator,
      label: 'Calculadora Lotes',
      href: '/lot-calculator',
      active: pathname === '/lot-calculator'
    },
    {
      icon: DollarSign,
      label: 'Conversión Divisas',
      href: '/currency-converter',
      active: pathname === '/currency-converter'
    },
    {
      icon: BarChart3,
      label: 'Mis Trades',
      href: '/trades',
      active: pathname === '/trades'
    },
    {
      icon: Calendar,
      label: 'Calendario P&L',
      href: '/profit-calendar',
      active: pathname === '/profit-calendar'
    },
    {
      icon: TrendingUp,
      label: 'Feed',
      href: '/feed',
      active: pathname === '/feed'
    },
    {
      icon: Trophy,
      label: 'Leaderboards',
      href: '/leaderboards',
      active: pathname === '/leaderboards'
    },
    {
      icon: Users,
      label: 'Referidos',
      href: '/referrals',
      active: pathname === '/referrals'
    },
    {
      icon: User,
      label: 'Perfil',
      href: '/profile',
      active: pathname === '/profile'
    }
  ]

  const bottomItems = [
    ...(isPremium ? [{
      icon: CreditCard,
      label: 'Suscripción',
      href: '/subscription',
      active: pathname === '/subscription'
    }] : [{
      icon: Star,
      label: 'Premium',
      href: '/pricing',
      active: pathname === '/pricing'
    }])
  ]

  return (
    <>
      {/* Desktop Sidebar Only */}
      <div className="hidden md:block fixed left-0 top-0 h-full border-r border-gray-800 z-50 w-64" style={{backgroundColor: '#010318'}}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-gray-800">
            <div className="flex items-center space-x-3">
              <Image
                src="/logo.jpeg"
                alt="TradeTrackr"
                width={40}
                height={40}
                priority
                unoptimized
                className="rounded-xl"
              />
              <span className="text-white font-bold text-lg">TradeTrackr</span>
            </div>
          </div>

          {/* User Info */}
          <div className="p-4 border-b border-gray-800">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="text-white font-medium text-sm truncate">
                    {user?.email?.split('@')[0] || 'Usuario'}
                  </span>
                  {isPremium && (
                    <Star className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                  )}
                </div>
                <div className="text-xs text-gray-400">
                  {isPremium ? 'Premium' : 'Gratis'}
                </div>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {menuItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors
                  ${item.active 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }
                `}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium">{item.label}</span>
              </Link>
            ))}
          </nav>

          {/* Bottom Section */}
          <div className="p-4 border-t border-gray-800 space-y-2">
            {bottomItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors
                  ${item.active 
                    ? 'bg-blue-600 text-white' 
                    : item.label === 'Premium' 
                      ? 'text-yellow-400 hover:text-yellow-300 hover:bg-yellow-400/10'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }
                `}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium">{item.label}</span>
              </Link>
            ))}
            
            <button
              onClick={handleLogout}
              className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-400/10 transition-colors"
            >
              <LogOut className="w-5 h-5 flex-shrink-0" />
              <span className="font-medium">Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </div>
    </>
  )
} 