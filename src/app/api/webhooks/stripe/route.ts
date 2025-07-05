import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  const body = await req.text();
  const headersList = await headers();
  const sig = headersList.get('stripe-signature');

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig!, endpointSecret);
  } catch (err: any) {
    console.error('❌ Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 });
  }

  console.log('🔔 Stripe webhook received:', event.type);

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;
      
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;
      
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      
      default:
        console.log(`🤷‍♂️ Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('❌ Error processing webhook:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  console.log('🎉 Checkout completed:', session.id);
  
  if (!session.customer_email) {
    console.error('❌ No customer email in checkout session');
    return;
  }

  // Hacer premium al usuario
  await makeUserPremium(session.customer_email, session.customer as string);
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  console.log('📅 Subscription created:', subscription.id);
  
  const customer = await stripe.customers.retrieve(subscription.customer as string);
  
  if ('email' in customer && customer.email) {
    await makeUserPremium(customer.email, subscription.customer as string);
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log('🔄 Subscription updated:', subscription.id);
  
  const customer = await stripe.customers.retrieve(subscription.customer as string);
  
  if ('email' in customer && customer.email) {
    if (subscription.status === 'active') {
      await makeUserPremium(customer.email, subscription.customer as string);
    } else if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
      await removeUserPremium(customer.email);
    }
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log('❌ Subscription deleted:', subscription.id);
  
  const customer = await stripe.customers.retrieve(subscription.customer as string);
  
  if ('email' in customer && customer.email) {
    await removeUserPremium(customer.email);
  }
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log('💰 Payment succeeded:', invoice.id);
  
  if (invoice.customer_email) {
    await makeUserPremium(invoice.customer_email, invoice.customer as string);
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  console.log('💸 Payment failed:', invoice.id);
  
  if (invoice.customer_email) {
    // Opcional: podrías quitar premium después de varios fallos
    console.log(`⚠️ Payment failed for ${invoice.customer_email}`);
  }
}

async function makeUserPremium(email: string, stripeCustomerId: string) {
  console.log(`🌟 Making user premium: ${email}`);
  
  try {
    // Buscar usuario por email
    const { data: authUser, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Error fetching users:', authError);
      return;
    }

    const user = authUser.users.find(u => u.email === email);
    
    if (!user) {
      console.error(`❌ User not found: ${email}`);
      return;
    }

    // Generar username seguro
    const username = email.split('@')[0] || `user_${user.id.substring(0, 8)}`;
    
    // Crear/actualizar perfil
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        username: username,
        email: email,
        is_premium: true,
        account_balance: 1000.00,
        stripe_customer_id: stripeCustomerId,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      });

    if (profileError) {
      console.error('❌ Error updating profile:', profileError);
      return;
    }

    // Crear/actualizar user_stats si no existe
    const { error: statsError } = await supabase
      .from('user_stats')
      .upsert({
        user_id: user.id,
        current_balance: 1000.00,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (statsError) {
      console.error('❌ Error updating user_stats:', statsError);
    }

    console.log(`✅ User made premium successfully: ${email}`);
  } catch (error) {
    console.error('❌ Error making user premium:', error);
  }
}

async function removeUserPremium(email: string) {
  console.log(`❌ Removing premium from user: ${email}`);
  
  try {
    // Buscar usuario por email
    const { data: authUser, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Error fetching users:', authError);
      return;
    }

    const user = authUser.users.find(u => u.email === email);
    
    if (!user) {
      console.error(`❌ User not found: ${email}`);
      return;
    }

    // Actualizar perfil para quitar premium
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        is_premium: false,
        premium_expires_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (profileError) {
      console.error('❌ Error removing premium:', profileError);
      return;
    }

    console.log(`✅ Premium removed successfully: ${email}`);
  } catch (error) {
    console.error('❌ Error removing premium:', error);
  }
} 