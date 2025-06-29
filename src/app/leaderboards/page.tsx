import { Metadata } from 'next'
import LeaderboardsView from '@/components/leaderboards/LeaderboardsView'

export const metadata: Metadata = {
  title: 'Leaderboards - TradeTrackr',
  description: 'Compite con traders de todo el mundo y con tus amigos en grupos privados',
}

export default function LeaderboardsPage() {
  return <LeaderboardsView />
} 