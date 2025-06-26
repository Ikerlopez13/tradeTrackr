// ===================================
// TIPOS TYPESCRIPT - Sistema de Referidos
// ===================================

export interface ReferralConfig {
  id: string;
  tier: number;
  name: string;
  description?: string;
  referrer_reward_type: 'premium_days' | 'cash_bonus' | 'feature_unlock';
  referrer_reward_value: number;
  referred_reward_type: 'premium_days' | 'cash_bonus' | 'feature_unlock';
  referred_reward_value: number;
  min_referrals_required: number;
  active: boolean;
  created_at: string;
}

export interface Referral {
  id: string;
  referrer_id: string;
  referred_id: string;
  referral_code: string;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  reward_tier: number;
  referrer_reward_amount: number;
  referred_reward_amount: number;
  referrer_reward_claimed: boolean;
  referred_reward_claimed: boolean;
  completed_at?: string;
  created_at: string;
  updated_at: string;
  // Perfil del usuario referido (incluido en consultas con join)
  referred_profile?: {
    username: string;
    email: string;
    created_at: string;
  };
}

export interface ReferralReward {
  id: string;
  user_id: string;
  referral_id: string;
  reward_type: 'premium_days' | 'cash_bonus' | 'feature_unlock';
  reward_value: number;
  reward_description: string;
  claimed: boolean;
  claimed_at?: string;
  expires_at?: string;
  created_at: string;
}

export interface ReferralStats {
  user_id: string;
  username: string;
  referral_code: string;
  referrals_count: number;
  total_rewards_earned: number;
  active_referrals: number;
  total_rewards: number;
  claimed_rewards: number;
  total_claimed_value: number;
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  account_balance: number;
  is_premium: boolean;
  premium_expires_at?: string;
  referral_code: string;
  referred_by?: string;
  referrals_count: number;
  total_rewards_earned: number;
  created_at: string;
  updated_at: string;
}

// Tipos para las APIs
export interface ProcessReferralRequest {
  referral_code: string;
}

export interface ProcessReferralResponse {
  success: boolean;
  message: string;
  referral?: Referral;
  rewards?: ReferralReward[];
}

export interface ClaimRewardRequest {
  reward_id: string;
}

export interface ClaimRewardResponse {
  success: boolean;
  message: string;
  reward?: ReferralReward;
}

export interface ReferralDashboardData {
  user_profile: UserProfile;
  referral_stats: ReferralStats;
  active_referrals: Referral[];
  unclaimed_rewards: ReferralReward[];
  referral_config: ReferralConfig[];
  referral_link: string;
}

// Tipos para componentes
export interface ReferralCardProps {
  referral: Referral;
  onClaimReward?: (rewardId: string) => void;
}

export interface ReferralStatsCardProps {
  stats: ReferralStats;
  config: ReferralConfig[];
}

export interface ReferralLinkProps {
  referralCode: string;
  onCopy?: () => void;
}

export interface RewardBadgeProps {
  reward: ReferralReward;
  onClaim?: (rewardId: string) => void;
}

// Constantes
export const REFERRAL_TIERS = {
  BASIC: 1,
  BRONZE: 2,
  GOLD: 3,
} as const;

export const REWARD_TYPES = {
  PREMIUM_DAYS: 'premium_days',
  CASH_BONUS: 'cash_bonus',
  FEATURE_UNLOCK: 'feature_unlock',
} as const;

export const REFERRAL_STATUS = {
  PENDING: 'pending',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const; 