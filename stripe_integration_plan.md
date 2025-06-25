# Plan de Integración Stripe + Supabase para TradeTrackr

## 🎯 Campos de Stripe que coinciden con tu BD

### **1. Tabla `profiles` - Campos para Premium**
```sql
-- Campos actuales en tu BD que Stripe debe actualizar:
- id (UUID)                  ← Vincular con Stripe Customer ID
- email (TEXT)               ← ✅ NUEVO: Para buscar usuarios fácilmente
- is_premium (BOOLEAN)       ← Activar cuando pago exitoso
- account_balance (DECIMAL)  ← Mantener balance actual
- username (TEXT)            ← Usar para personalización
```

**Campos de Stripe a capturar:**
- `customer.id` → Guardar en nueva columna `stripe_customer_id`
- `customer.email` → ✅ **Buscar en `profiles.email`** (más fácil)
- `subscription.status` → Mapear a `is_premium` (active = true)
- `subscription.current_period_end` → Nueva columna `premium_expires_at`
- `invoice.amount_paid` → Para historial de pagos

### **2. Nueva tabla `stripe_subscriptions` (recomendada)**
```sql
CREATE TABLE stripe_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT NOT NULL,
  stripe_subscription_id TEXT UNIQUE,
  status TEXT NOT NULL, -- active, canceled, past_due, etc.
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  amount_paid DECIMAL(10,2),
  currency TEXT DEFAULT 'USD',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### **3. Webhooks de Stripe a escuchar**

#### **A. `customer.subscription.created`**
```javascript
// Cuando usuario se suscribe por primera vez
{
  "type": "customer.subscription.created",
  "data": {
    "object": {
      "id": "sub_1234567890",           // → stripe_subscription_id
      "customer": "cus_1234567890",     // → stripe_customer_id  
      "status": "active",               // → status + is_premium = true
      "current_period_end": 1640995200, // → premium_expires_at
      "items": {
        "data": [{
          "price": {
            "unit_amount": 599,         // → amount_paid (5.99)
            "currency": "usd"           // → currency
          }
        }]
      }
    }
  }
}
```

#### **B. `customer.subscription.updated`**
```javascript
// Cuando cambia estado de suscripción
{
  "type": "customer.subscription.updated", 
  "data": {
    "object": {
      "status": "canceled",  // → is_premium = false
      "cancel_at_period_end": true
    }
  }
}
```

#### **C. `invoice.payment_succeeded`**
```javascript
// Pago exitoso (renovación mensual)
{
  "type": "invoice.payment_succeeded",
  "data": {
    "object": {
      "customer": "cus_1234567890",
      "customer_email": "user@example.com",  // ✅ USAR ESTO
      "amount_paid": 599,        // → $5.99
      "subscription": "sub_123"  // → Actualizar fecha expiración
    }
  }
}
```

#### **D. `invoice.payment_failed`**
```javascript
// Pago fallido
{
  "type": "invoice.payment_failed",
  "data": {
    "object": {
      "customer": "cus_1234567890",
      "customer_email": "user@example.com",  // ✅ USAR ESTO
      "subscription": "sub_123"  // → Marcar como past_due
    }
  }
}
```

## 🔄 Flujo de Integración

### **Paso 1: Setup inicial**
```sql
-- Agregar campos necesarios a profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN stripe_customer_id TEXT UNIQUE,
ADD COLUMN premium_expires_at TIMESTAMPTZ;

-- Crear índices
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_stripe_customer ON profiles(stripe_customer_id);
CREATE INDEX idx_profiles_premium_expires ON profiles(premium_expires_at);
```

### **Paso 2: Endpoint de Webhooks** 
```javascript
// /api/stripe/webhook
export async function POST(request) {
  const sig = request.headers.get('stripe-signature')
  const body = await request.text()
  
  try {
    const event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)
    
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionChange(event.data.object)
        break
        
      case 'invoice.payment_succeeded':
        await handlePaymentSuccess(event.data.object)
        break
        
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object)
        break
    }
    
    return new Response('OK', { status: 200 })
  } catch (err) {
    return new Response('Webhook Error', { status: 400 })
  }
}
```

### **Paso 3: Funciones de manejo (MEJORADAS)**
```javascript
async function handleSubscriptionChange(subscription) {
  const { customer, status, current_period_end } = subscription
  
  // ✅ MÉTODO 1: Buscar por stripe_customer_id
  let profile = await supabase
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customer)
    .single()
  
  // ✅ MÉTODO 2: Si no existe, buscar por email del customer
  if (!profile.data) {
    const stripeCustomer = await stripe.customers.retrieve(customer)
    profile = await supabase
      .from('profiles')
      .select('id')
      .eq('email', stripeCustomer.email)
      .single()
      
    // Guardar stripe_customer_id para futuras consultas
    if (profile.data) {
      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customer })
        .eq('id', profile.data.id)
    }
  }
  
  if (profile.data) {
    // Actualizar estado premium
    await supabase
      .from('profiles')
      .update({
        is_premium: status === 'active',
        premium_expires_at: new Date(current_period_end * 1000).toISOString()
      })
      .eq('id', profile.data.id)
  }
}

async function handlePaymentSuccess(invoice) {
  const { customer_email, amount_paid } = invoice
  
  // ✅ Buscar directamente por email (más fácil)
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', customer_email)
    .single()
  
  if (profile) {
    // Registrar pago exitoso
    await supabase
      .from('stripe_payments')
      .insert({
        user_id: profile.id,
        stripe_customer_id: invoice.customer,
        stripe_invoice_id: invoice.id,
        amount_paid: amount_paid / 100, // Stripe usa centavos
        status: 'succeeded'
      })
  }
}
```

## 💳 Productos de Stripe a crear

### **1. Producto Premium Monthly**
```javascript
// En Stripe Dashboard o API
const product = await stripe.products.create({
  name: 'TradeTrackr Premium',
  description: 'Trades ilimitados + análisis avanzados'
})

const price = await stripe.prices.create({
  product: product.id,
  unit_amount: 599, // $5.99
  currency: 'usd',
  recurring: {
    interval: 'month'
  }
})
```

### **2. Checkout Session**
```javascript
// /api/stripe/create-checkout
const session = await stripe.checkout.sessions.create({
  customer_email: user.email,  // ✅ Usar email del usuario
  payment_method_types: ['card'],
  line_items: [{
    price: 'price_1234567890', // ID del precio Premium
    quantity: 1
  }],
  mode: 'subscription',
  success_url: `${origin}/profile?success=true`,
  cancel_url: `${origin}/profile?canceled=true`,
  metadata: {
    user_id: user.id,
    user_email: user.email  // ✅ Metadata adicional
  }
})
```

## 🔍 Campos específicos a mapear

| **Stripe Field** | **Supabase Column** | **Tabla** | **Uso** |
|------------------|-------------------|-----------|---------|
| `customer.email` | `email` | `profiles` | ✅ **Buscar usuario** |
| `customer.id` | `stripe_customer_id` | `profiles` | Vincular customer |
| `subscription.status` | `is_premium` | `profiles` | Estado premium |
| `subscription.current_period_end` | `premium_expires_at` | `profiles` | Fecha expiración |
| `invoice.amount_paid` | `amount_paid` | `stripe_payments` | Historial pagos |
| `subscription.id` | `stripe_subscription_id` | `stripe_subscriptions` | ID suscripción |

## 🚀 Implementación rápida

### **Archivo: /api/stripe/webhook.js**
```javascript
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const supabase = createClient()

export async function POST(request) {
  // Código del webhook aquí
}
```

### **Componente: UpgradeButton.tsx**
```tsx
'use client'

export default function UpgradeButton({ user }) {
  const handleUpgrade = async () => {
    const response = await fetch('/api/stripe/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        user_id: user.id,
        user_email: user.email  // ✅ Enviar email también
      })
    })
    
    const { url } = await response.json()
    window.location.href = url
  }

  return (
    <button onClick={handleUpgrade} className="bg-yellow-600 text-white px-6 py-3 rounded-lg">
      Upgrade a Premium - $5.99/mes
    </button>
  )
}
```

## ✅ Checklist de implementación

- [ ] ✅ **Ejecutar `fix_profiles_with_email.sql`** - Agregar campo email
- [ ] Ejecutar `add_stripe_fields.sql` - Agregar campos Stripe
- [ ] Crear tabla `stripe_subscriptions` (opcional pero recomendada)
- [ ] Configurar productos en Stripe Dashboard
- [ ] Implementar webhook endpoint
- [ ] Crear checkout session endpoint
- [ ] Agregar botón de upgrade en UI
- [ ] Testear con Stripe Test Mode
- [ ] Configurar webhooks en producción

## 🎯 **VENTAJAS del campo email:**

1. **Más fácil búsqueda**: `WHERE email = 'user@example.com'`
2. **Mejor integración con Stripe**: Los webhooks traen el email
3. **Menos dependencia de customer_id**: Funciona aunque no tengas stripe_customer_id
4. **Debugging más fácil**: Puedes ver directamente qué usuario es

¿Ejecutamos primero el `fix_profiles_with_email.sql` para corregir el problema? 