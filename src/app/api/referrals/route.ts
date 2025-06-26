import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ProcessReferralRequest, ProcessReferralResponse, ReferralReward } from '@/types/referrals';

// GET - Obtener datos del dashboard de referidos
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Obtener perfil del usuario con código de referido
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      return NextResponse.json({ error: 'Error al obtener perfil' }, { status: 500 });
    }

    // Obtener estadísticas de referidos
    const { data: stats, error: statsError } = await supabase
      .from('referral_stats')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Obtener referidos activos
    const { data: activeReferrals, error: referralsError } = await supabase
      .from('referrals')
      .select(`
        *,
        referred_profile:profiles!referrals_referred_id_fkey(username, email, created_at)
      `)
      .eq('referrer_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    // Obtener recompensas no reclamadas
    const { data: unclaimedRewards, error: rewardsError } = await supabase
      .from('referral_rewards')
      .select('*')
      .eq('user_id', user.id)
      .eq('claimed', false)
      .order('created_at', { ascending: false });

    // Obtener configuración de tiers
    const { data: referralConfig, error: configError } = await supabase
      .from('referral_config')
      .select('*')
      .eq('active', true)
      .order('tier', { ascending: true });

    // Generar link de referido
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const referralLink = `${baseUrl}/signup?ref=${profile.referral_code}`;

    const dashboardData = {
      user_profile: profile,
      referral_stats: stats || {
        user_id: user.id,
        username: profile.username,
        referral_code: profile.referral_code,
        referrals_count: profile.referrals_count || 0,
        total_rewards_earned: profile.total_rewards_earned || 0,
        active_referrals: 0,
        total_rewards: 0,
        claimed_rewards: 0,
        total_claimed_value: 0
      },
      active_referrals: activeReferrals || [],
      unclaimed_rewards: unclaimedRewards || [],
      referral_config: referralConfig || [],
      referral_link: referralLink
    };

    return NextResponse.json(dashboardData);

  } catch (error) {
    console.error('Error en GET /api/referrals:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// POST - Procesar un nuevo referido
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body: ProcessReferralRequest = await request.json();
    const { referral_code } = body;

    if (!referral_code) {
      return NextResponse.json({ 
        success: false, 
        message: 'Código de referido requerido' 
      }, { status: 400 });
    }

    // Llamar a la función de base de datos para procesar el referido
    const { data: result, error } = await supabase
      .rpc('process_referral', {
        referred_user_id: user.id,
        referral_code_used: referral_code
      });

    if (error) {
      console.error('Error procesando referido:', error);
      return NextResponse.json({ 
        success: false, 
        message: 'Error al procesar referido' 
      }, { status: 500 });
    }

    if (!result) {
      return NextResponse.json({ 
        success: false, 
        message: 'Código de referido inválido o ya utilizado' 
      }, { status: 400 });
    }

    // Obtener el referido creado y las recompensas
    const { data: referral } = await supabase
      .from('referrals')
      .select('*')
      .eq('referred_id', user.id)
      .single();

    const { data: rewards } = await supabase
      .from('referral_rewards')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(2);

    const response: ProcessReferralResponse = {
      success: true,
      message: '¡Referido procesado exitosamente! Has recibido días Premium gratis.',
      referral,
      rewards: rewards as ReferralReward[] || undefined
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error en POST /api/referrals:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Error interno del servidor' 
    }, { status: 500 });
  }
} 