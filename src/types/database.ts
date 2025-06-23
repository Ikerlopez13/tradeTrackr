export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string | null
          avatar_url: string | null
          is_pro: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username?: string | null
          avatar_url?: string | null
          is_pro?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string | null
          avatar_url?: string | null
          is_pro?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      trades: {
        Row: {
          id: string
          user_id: string
          title: string
          pair: string
          timeframe: string
          session: string | null
          bias: string | null
          risk_reward: string
          result: string
          feeling: number
          description: string | null
          screenshot_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          pair: string
          timeframe: string
          session?: string | null
          bias?: string | null
          risk_reward: string
          result: string
          feeling: number
          description?: string | null
          screenshot_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          pair?: string
          timeframe?: string
          session?: string | null
          bias?: string | null
          risk_reward?: string
          result?: string
          feeling?: number
          description?: string | null
          screenshot_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      user_stats: {
        Row: {
          user_id: string
          total_trades: number
          winning_trades: number
          losing_trades: number
          break_even_trades: number
          win_rate: number
          profit_factor: number
          average_rr: number
          best_day_percentage: number
          max_drawdown: number
          last_updated: string
        }
        Insert: {
          user_id: string
          total_trades?: number
          winning_trades?: number
          losing_trades?: number
          break_even_trades?: number
          win_rate?: number
          profit_factor?: number
          average_rr?: number
          best_day_percentage?: number
          max_drawdown?: number
          last_updated?: string
        }
        Update: {
          user_id?: string
          total_trades?: number
          winning_trades?: number
          losing_trades?: number
          break_even_trades?: number
          win_rate?: number
          profit_factor?: number
          average_rr?: number
          best_day_percentage?: number
          max_drawdown?: number
          last_updated?: string
        }
      }
    }
  }
} 