import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ClaimRewardRequest, ClaimRewardResponse } from '@/types/referrals';

// POST - Reclamar recompensa de referido
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body: ClaimRewardRequest = await request.json();
    const { reward_id } = body;

    if (!reward_id) {
      return NextResponse.json({ 
        success: false, 
        message: 'ID de recompensa requerido' 
      }, { status: 400 });
    }

    // Verificar que la recompensa pertenece al usuario y no ha sido reclamada
    const { data: reward, error: rewardError } = await supabase
      .from('referral_rewards')
      .select('*')
      .eq('id', reward_id)
      .eq('user_id', user.id)
      .eq('claimed', false)
      .single();

    if (rewardError || !reward) {
      return NextResponse.json({ 
        success: false, 
        message: 'Recompensa no encontrada o ya reclamada' 
      }, { status: 404 });
    }

    // Llamar a la función de base de datos para reclamar la recompensa
    const { data: result, error } = await supabase
      .rpc('claim_referral_reward', {
        reward_id: reward_id,
        claiming_user_id: user.id
      });

    if (error) {
      console.error('Error reclamando recompensa:', error);
      return NextResponse.json({ 
        success: false, 
        message: 'Error al reclamar recompensa' 
      }, { status: 500 });
    }

    if (!result) {
      return NextResponse.json({ 
        success: false, 
        message: 'No se pudo reclamar la recompensa' 
      }, { status: 400 });
    }

    // Obtener la recompensa actualizada
    const { data: updatedReward } = await supabase
      .from('referral_rewards')
      .select('*')
      .eq('id', reward_id)
      .single();

    const response: ClaimRewardResponse = {
      success: true,
      message: `¡Recompensa reclamada! ${reward.reward_description}`,
      reward: updatedReward
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error en POST /api/referrals/claim:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Error interno del servidor' 
    }, { status: 500 });
  }
} 