'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ReferralDashboardData, ReferralReward } from '@/types/referrals';
import { Copy, Users, Gift, Star, Crown, Trophy, ExternalLink, Check } from 'lucide-react';
import Image from 'next/image';
import Layout from '@/components/Layout';
import LoadingSpinner from '@/components/LoadingSpinner';

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
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <LoadingSpinner size={100} />
        </div>
      </Layout>
    );
  }

  if (!data) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-white text-center">
            <h2 className="text-2xl font-bold mb-4 text-white">Error al cargar datos</h2>
            <button 
              onClick={fetchReferralData}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Reintentar
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="pb-20 md:pb-8">
        <div className="max-w-6xl mx-auto px-4 py-6">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                  Sistema de Referidos
                </h1>
                <p className="text-gray-400 text-lg">
                  Invita amigos y gana recompensas Premium
                </p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-yellow-400">
                  {data.referral_stats.referrals_count}
                </div>
                <div className="text-sm text-gray-400">Referidos Activos</div>
              </div>
            </div>
          </div>

          {/* Estadísticas Principales */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 hover:bg-gray-800/70 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm font-medium">Total Referidos</p>
                  <p className="text-3xl font-bold text-blue-400">{data.referral_stats.referrals_count}</p>
                </div>
                <div className="p-3 bg-blue-500/20 rounded-lg">
                  <Users className="w-8 h-8 text-blue-400" />
                </div>
              </div>
            </div>

            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 hover:bg-gray-800/70 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm font-medium">Recompensas Ganadas</p>
                  <p className="text-3xl font-bold text-green-400">{data.referral_stats.total_rewards}</p>
                </div>
                <div className="p-3 bg-green-500/20 rounded-lg">
                  <Gift className="w-8 h-8 text-green-400" />
                </div>
              </div>
            </div>

            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 hover:bg-gray-800/70 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm font-medium">Días Premium Ganados</p>
                  <p className="text-3xl font-bold text-purple-400">{Math.round(data.referral_stats.total_claimed_value)}</p>
                </div>
                <div className="p-3 bg-purple-500/20 rounded-lg">
                  <Crown className="w-8 h-8 text-purple-400" />
                </div>
              </div>
            </div>

            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 hover:bg-gray-800/70 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm font-medium">Pendientes</p>
                  <p className="text-3xl font-bold text-yellow-400">{data.unclaimed_rewards.length}</p>
                </div>
                <div className="p-3 bg-yellow-500/20 rounded-lg">
                  <Star className="w-8 h-8 text-yellow-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Link de Referido */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 mb-8">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 text-white">
              <ExternalLink className="w-6 h-6 text-blue-400" />
              Tu Link de Referido
            </h2>
            <div className="flex items-center gap-3 p-4 bg-gray-900/50 rounded-lg border border-gray-600/50">
              <input
                type="text"
                value={data.referral_link}
                readOnly
                className="flex-1 bg-transparent text-white text-sm focus:outline-none"
              />
              <button
                onClick={copyReferralLink}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
              >
                {copySuccess ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copySuccess ? 'Copiado' : 'Copiar'}
              </button>
            </div>
            <p className="text-gray-400 text-sm mt-4">
              Comparte este link con tus amigos. Cuando se registren usando tu link, ambos recibirán recompensas.
            </p>
          </div>

          {/* Recompensas Pendientes */}
          {data.unclaimed_rewards.length > 0 && (
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 mb-8">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 text-white">
                <Gift className="w-6 h-6 text-yellow-400" />
                Recompensas Pendientes
              </h2>
              <div className="space-y-4">
                {data.unclaimed_rewards.map((reward) => (
                  <div key={reward.id} className="flex items-center justify-between p-4 bg-gray-900/50 rounded-lg border border-gray-600/50 hover:bg-gray-900/70 transition-colors">
                    <div className="flex items-center gap-3">
                      {getTierIcon(1)}
                      <div>
                        <p className="font-medium text-white">{reward.reward_description}</p>
                        <p className="text-sm text-gray-400">
                          {reward.reward_value} días Premium • {formatDate(reward.created_at)}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => claimReward(reward.id)}
                      disabled={claimingReward === reward.id}
                      className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg transition-colors font-medium"
                    >
                      {claimingReward === reward.id ? 'Reclamando...' : 'Reclamar'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Historial de Referidos */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 mb-8">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 text-white">
              <Users className="w-6 h-6 text-blue-400" />
              Historial de Referidos
            </h2>
            {data.active_referrals.length > 0 ? (
              <div className="space-y-4">
                {data.active_referrals.map((referral) => (
                  <div key={referral.id} className="flex items-center justify-between p-4 bg-gray-900/50 rounded-lg border border-gray-600/50 hover:bg-gray-900/70 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                        <Users className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-white">
                          {referral.referred_profile?.username || 'Usuario Referido'}
                        </p>
                        <p className="text-sm text-gray-400">
                          Registrado el {formatDate(referral.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        referral.status === 'active' 
                          ? 'bg-green-600/20 text-green-400 border border-green-500/30' 
                          : 'bg-yellow-600/20 text-yellow-400 border border-yellow-500/30'
                      }`}>
                        {referral.status === 'active' ? 'Activo' : 'Pendiente'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 text-lg">Aún no tienes referidos</p>
                <p className="text-gray-500 text-sm mt-2">Comparte tu link para empezar a ganar recompensas</p>
              </div>
            )}
          </div>

          {/* Información del Sistema */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 text-white">
              <Trophy className="w-6 h-6 text-purple-400" />
              Cómo Funciona
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-500/30">
                  <ExternalLink className="w-8 h-8 text-blue-400" />
                </div>
                <h3 className="font-bold text-white mb-2 text-lg">1. Comparte tu Link</h3>
                <p className="text-gray-400">Envía tu link único a amigos y familiares</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-green-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-green-500/30">
                  <Users className="w-8 h-8 text-green-400" />
                </div>
                <h3 className="font-bold text-white mb-2 text-lg">2. Ellos se Registran</h3>
                <p className="text-gray-400">Tus amigos crean una cuenta usando tu link</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-purple-500/30">
                  <Gift className="w-8 h-8 text-purple-400" />
                </div>
                <h3 className="font-bold text-white mb-2 text-lg">3. Ganas Recompensas</h3>
                <p className="text-gray-400">Ambos reciben días Premium gratis</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
} 