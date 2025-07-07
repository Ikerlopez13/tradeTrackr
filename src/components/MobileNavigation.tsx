'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { 
  BarChart2,
  BookOpen,
  Calculator,
  DollarSign,
  BarChart3,
  Calendar,
  TrendingUp,
  Trophy,
  Users,
  User,
  Star,
  CreditCard,
  LogOut,
  MoreHorizontal
} from 'lucide-react'
import { useState } from 'react'

interface MobileNavigationProps {
  user?: any
  profile?: any
}

export default function MobileNavigation({ user, profile }: MobileNavigationProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [showMore, setShowMore] = useState(false)

  const isPremium = profile?.is_premium || false

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      router.push('/login')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  // Main navigation items (always visible)
  const mainNavItems = [
    {
      href: '/dashboard',
      label: 'Dashboard',
      icon: BarChart2,
      active: pathname === '/dashboard'
    },
    {
      href: '/',
      label: 'Journal',
      icon: BookOpen,
      active: pathname === '/'
    },
    {
      href: '/trades',
      label: 'Trades',
      icon: BarChart3,
      active: pathname === '/trades'
    },
    {
      href: '/feed',
      label: 'Feed',
      icon: TrendingUp,
      active: pathname === '/feed'
    }
  ]

  // Secondary navigation items (in "more" menu)
  const moreNavItems = [
    {
      href: '/lot-calculator',
      label: 'Calculadora',
      icon: Calculator,
      active: pathname === '/lot-calculator'
    },
    {
      href: '/currency-converter',
      label: 'Divisas',
      icon: DollarSign,
      active: pathname === '/currency-converter'
    },
    {
      href: '/profit-calendar',
      label: 'Calendario',
      icon: Calendar,
      active: pathname === '/profit-calendar'
    },
    {
      href: '/leaderboards',
      label: 'Ranking',
      icon: Trophy,
      active: pathname === '/leaderboards'
    },
    {
      href: '/referrals',
      label: 'Referidos',
      icon: Users,
      active: pathname === '/referrals'
    },
    {
      href: '/profile',
      label: 'Perfil',
      icon: User,
      active: pathname === '/profile'
    },
    ...(isPremium ? [{
      href: '/subscription',
      label: 'Suscripción',
      icon: CreditCard,
      active: pathname === '/subscription'
    }] : [{
      href: '/pricing',
      label: 'Premium',
      icon: Star,
      active: pathname === '/pricing'
    }])
  ]

  return (
    <>
      {/* More Menu Overlay */}
      {showMore && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setShowMore(false)}
        />
      )}

      {/* More Menu */}
      {showMore && (
        <div className="md:hidden fixed bottom-16 left-0 right-0 border-t border-gray-800 z-50 max-h-80 overflow-y-auto" style={{backgroundColor: '#010318'}}>
          {/* User Info */}
          <div className="p-4 border-b border-gray-800">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="text-white font-medium text-sm truncate">
                    {user?.email?.split('@')[0] || 'Usuario'}
                  </span>
                  {isPremium && (
                    <Star className="w-3 h-3 text-yellow-400 flex-shrink-0" />
                  )}
                </div>
                <div className="text-xs text-gray-400">
                  {isPremium ? 'Premium' : 'Gratis'}
                </div>
              </div>
            </div>
          </div>

          {/* More Navigation Items */}
          <div className="p-2">
            <div className="grid grid-cols-3 gap-2">
              {moreNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setShowMore(false)}
                  className={`
                    flex flex-col items-center p-3 rounded-lg transition-colors
                    ${item.active 
                      ? item.label === 'Premium' 
                        ? 'bg-yellow-400/20 text-yellow-400' 
                        : 'bg-blue-600 text-white'
                      : item.label === 'Premium'
                        ? 'text-yellow-400 hover:bg-yellow-400/10'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800'
                    }
                  `}
                >
                  <item.icon className="w-5 h-5 mb-1" />
                  <span className="text-xs font-medium text-center leading-tight">{item.label}</span>
                </Link>
              ))}
            </div>

            {/* Logout Button */}
            <button
              onClick={() => {
                setShowMore(false)
                handleLogout()
              }}
              className="w-full flex items-center justify-center space-x-2 p-3 mt-3 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-400/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm font-medium">Cerrar Sesión</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 backdrop-blur-sm border-t border-gray-800 z-50" style={{backgroundColor: '#010318'}}>
        <div className="flex justify-around items-center py-2">
          {mainNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center py-1 px-2 transition-colors min-w-0 ${
                item.active 
                  ? 'text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <item.icon className="w-5 h-5 mb-1" />
              <span className="text-xs font-medium truncate">{item.label}</span>
            </Link>
          ))}
          
          {/* More Button */}
          <button
            onClick={() => setShowMore(!showMore)}
            className={`flex flex-col items-center py-1 px-2 transition-colors min-w-0 ${
              showMore 
                ? 'text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <MoreHorizontal className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium">Más</span>
          </button>
        </div>
      </nav>
    </>
  )
} 