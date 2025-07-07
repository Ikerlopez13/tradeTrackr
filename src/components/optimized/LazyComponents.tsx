import dynamic from 'next/dynamic'
import LoadingSpinner from '@/components/LoadingSpinner'

// Lazy load heavy components to reduce initial bundle size
export const LazyLeaderboardsView = dynamic(
  () => import('@/components/leaderboards/LeaderboardsView'),
  {
    loading: () => (
      <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: '#010314'}}>
        <LoadingSpinner size={100} />
      </div>
    ),
    ssr: false
  }
)

export const LazyGroupTradeFeed = dynamic(
  () => import('@/components/leaderboards/GroupTradeFeed'),
  {
    loading: () => (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size={60} />
      </div>
    ),
    ssr: false
  }
)

export const LazyProfitCalendar = dynamic(
  () => import('@/components/ProfitCalendar'),
  {
    loading: () => (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner size={60} />
      </div>
    ),
    ssr: false
  }
)

export const LazyTradeAdviceCard = dynamic(
  () => import('@/components/TradeAdviceCard'),
  {
    loading: () => (
      <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 backdrop-blur-sm rounded-lg p-6 border border-blue-500/20">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center animate-pulse">
            <span className="text-white font-bold text-sm">AI</span>
          </div>
          <div className="flex-1">
            <div className="h-4 bg-gray-600 rounded animate-pulse mb-2"></div>
            <div className="h-3 bg-gray-700 rounded animate-pulse w-3/4"></div>
          </div>
        </div>
      </div>
    ),
    ssr: false
  }
) 