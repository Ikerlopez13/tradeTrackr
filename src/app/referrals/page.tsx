'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ReferralDashboardData, ReferralReward } from '@/types/referrals';
import { Copy, Users, Gift, Star, Crown, Trophy, ExternalLink, Check } from 'lucide-react';
import Image from 'next/image';

export default function ReferralsPage() {
  const [data, setData] = useState<ReferralDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [claimingReward, setClaimingReward] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchReferralData();
  }, []);

  const fetchReferralData = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/login');
        return;
      }

      const response = await fetch('/api/referrals');
      if (response.ok) {
        const referralData: ReferralDashboardData = await response.json();
        setData(referralData);
      }
    } catch (error) {
      console.error('Error fetching referral data:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyReferralLink = async () => {
    if (!data?.referral_link) return;
    
    try {
      await navigator.clipboard.writeText(data.referral_link);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  };

  const claimReward = async (rewardId: string) => {
    setClaimingReward(rewardId);
    try {
      const response = await fetch('/api/referrals/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reward_id: rewardId })
      });

      if (response.ok) {
        // Recargar datos para mostrar recompensa reclamada
        await fetchReferralData();
      }
    } catch (error) {
      console.error('Error claiming reward:', error);
    } finally {
      setClaimingReward(null);
    }
  };

  const getTierIcon = (tier: number) => {
    switch (tier) {
      case 1: return <Star className="w-5 h-5 text-yellow-400" />;
      case 2: return <Crown className="w-5 h-5 text-orange-400" />;
      case 3: return <Trophy className="w-5 h-5 text-purple-400" />;
      default: return <Gift className="w-5 h-5 text-blue-400" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#010314] flex items-center justify-center">
        <div className="flex flex-col items-center">
          <Image
            src="/logo.jpeg"
            alt="TradeTrackr Logo"
            width={80}
            height={80}
            priority
            unoptimized
            className="rounded-lg animate-scale-cycle"
          />
          <p className="text-white mt-4 text-lg font-medium">Cargando referidos...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[#010314] flex items-center justify-center">
        <div className="text-white text-center">
          <h2 className="text-2xl font-bold mb-4">Error al cargar datos</h2>
          <button 
            onClick={fetchReferralData}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#010314] text-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-b border-blue-500/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Sistema de Referidos
              </h1>
              <p className="text-gray-400 mt-2">
                Invita amigos y gana recompensas Premium
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-yellow-400">
                {data.referral_stats.referrals_count}
              </div>
              <div className="text-sm text-gray-400">Referidos Activos</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Estadísticas Principales */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Referidos</p>
                <p className="text-2xl font-bold text-blue-400">{data.referral_stats.referrals_count}</p>
              </div>
              <Users className="w-8 h-8 text-blue-400" />
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Recompensas Ganadas</p>
                <p className="text-2xl font-bold text-green-400">{data.referral_stats.total_rewards}</p>
              </div>
              <Gift className="w-8 h-8 text-green-400" />
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Días Premium Ganados</p>
                <p className="text-2xl font-bold text-purple-400">{Math.round(data.referral_stats.total_claimed_value)}</p>
              </div>
              <Crown className="w-8 h-8 text-purple-400" />
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Pendientes</p>
                <p className="text-2xl font-bold text-yellow-400">{data.unclaimed_rewards.length}</p>
              </div>
              <Star className="w-8 h-8 text-yellow-400" />
            </div>
          </div>
        </div>

        {/* Link de Referido */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <ExternalLink className="w-5 h-5" />
            Tu Link de Referido
          </h2>
          <div className="flex items-center gap-4">
            <div className="flex-1 bg-gray-900/50 rounded-lg p-4 border border-gray-600/50">
              <p className="text-gray-300 text-sm mb-1">Código: <span className="font-mono text-blue-400">{data.user_profile.referral_code}</span></p>
              <p className="text-gray-400 text-xs break-all">{data.referral_link}</p>
            </div>
            <button
              onClick={copyReferralLink}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                copySuccess 
                  ? 'bg-green-600 text-white' 
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {copySuccess ? (
                <><Check className="w-4 h-4 mr-2" />Copiado</>
              ) : (
                <><Copy className="w-4 h-4 mr-2" />Copiar</>
              )}
            </button>
          </div>
        </div>

        {/* Recompensas Pendientes */}
        {data.unclaimed_rewards.length > 0 && (
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Gift className="w-5 h-5 text-yellow-400" />
              Recompensas Pendientes ({data.unclaimed_rewards.length})
            </h2>
            <div className="space-y-3">
              {data.unclaimed_rewards.map((reward: ReferralReward) => (
                <div key={reward.id} className="flex items-center justify-between p-4 bg-gray-900/50 rounded-lg border border-yellow-500/20">
                  <div className="flex items-center gap-3">
                    {getTierIcon(1)}
                    <div>
                      <p className="font-medium">{reward.reward_description}</p>
                      <p className="text-sm text-gray-400">
                        {reward.reward_value} días Premium • Creado {formatDate(reward.created_at)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => claimReward(reward.id)}
                    disabled={claimingReward === reward.id}
                    className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 text-white rounded-lg font-medium transition-colors"
                  >
                    {claimingReward === reward.id ? 'Reclamando...' : 'Reclamar'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tiers de Recompensas */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
          <h2 className="text-xl font-bold mb-4">Niveles de Recompensas</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {data.referral_config.map((config) => (
              <div 
                key={config.id} 
                className={`p-6 rounded-xl border-2 ${
                  data.referral_stats.referrals_count >= config.min_referrals_required
                    ? 'border-green-500 bg-green-500/10'
                    : 'border-gray-600 bg-gray-900/30'
                }`}
              >
                <div className="flex items-center gap-3 mb-4">
                  {getTierIcon(config.tier)}
                  <h3 className="text-lg font-bold">{config.name}</h3>
                  {data.referral_stats.referrals_count >= config.min_referrals_required && (
                    <Check className="w-5 h-5 text-green-400" />
                  )}
                </div>
                <p className="text-gray-400 text-sm mb-3">{config.description}</p>
                <div className="space-y-2 text-sm">
                  <p>
                    <span className="text-gray-400">Requisito:</span> {config.min_referrals_required} referidos
                  </p>
                  <p>
                    <span className="text-gray-400">Tu recompensa:</span> {config.referrer_reward_value} días Premium
                  </p>
                  <p>
                    <span className="text-gray-400">Recompensa referido:</span> {config.referred_reward_value} días Premium
                  </p>
                </div>
                <div className="mt-4">
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all"
                      style={{ 
                        width: `${Math.min(100, (data.referral_stats.referrals_count / config.min_referrals_required) * 100)}%` 
                      }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {data.referral_stats.referrals_count}/{config.min_referrals_required} referidos
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Lista de Referidos Activos */}
        {data.active_referrals.length > 0 && (
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Referidos Activos ({data.active_referrals.length})
            </h2>
            <div className="space-y-3">
              {data.active_referrals.map((referral) => (
                <div key={referral.id} className="flex items-center justify-between p-4 bg-gray-900/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                      {referral.referred_profile?.username?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <div>
                      <p className="font-medium">{referral.referred_profile?.username || 'Usuario'}</p>
                      <p className="text-sm text-gray-400">
                        Se unió el {formatDate(referral.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-green-400 font-medium">+{referral.referrer_reward_amount} días</div>
                    <div className="text-xs text-gray-400">Premium ganados</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instrucciones */}
        <div className="bg-gradient-to-r from-blue-600/10 to-purple-600/10 rounded-xl p-6 border border-blue-500/20">
          <h2 className="text-xl font-bold mb-4">¿Cómo funciona?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <ExternalLink className="w-6 h-6" />
              </div>
              <h3 className="font-bold mb-2">1. Comparte tu link</h3>
              <p className="text-gray-400 text-sm">Copia tu link de referido y compártelo con tus amigos</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="font-bold mb-2">2. Tus amigos se registran</h3>
              <p className="text-gray-400 text-sm">Cuando se registren con tu código, ambos reciben recompensas</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-yellow-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <Gift className="w-6 h-6" />
              </div>
              <h3 className="font-bold mb-2">3. Disfruta Premium</h3>
              <p className="text-gray-400 text-sm">Reclama tus recompensas y disfruta de días Premium gratis</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 