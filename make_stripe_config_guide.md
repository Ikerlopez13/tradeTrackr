# Configuración Make.com + Stripe para TradeTrackr

## 🚨 **Problema identificado:**
- Make.com intenta usar `id` (UUID) para identificar usuarios
- Stripe solo proporciona `customer_email`, no el UUID de Supabase
- Make.com da error: "id cannot be null"

## ✅ **Solución: Usar EMAIL como identificador**

### **1. En el Webhook de Stripe (Make.com):**

**Campos que debes capturar del webhook:**
```json
{
  "customer": "cus_1234567890",           // ID del customer en Stripe
  "customer_email": "user@example.com",   // ✅ ESTE ES EL CLAVE
  "subscription_id": "sub_1234567890",
  "status": "active"
}
```

### **2. En Make.com - Configuración del módulo Supabase:**

**❌ NO hagas esto:**
```
Campo: id
Valor: {{customer}} // ← Esto es NULL porque customer no es UUID
```

**✅ HAZ esto:**
```
Campo: email  
Valor: {{customer_email}} // ← Usar el email del customer
```

### **3. SQL Query para Make.com:**

Usa este SQL en el módulo "Execute SQL" de Make.com:

```sql
-- Actualizar usuario a premium usando EMAIL
UPDATE profiles 
SET 
    is_premium = true,
    stripe_customer_id = '{{customer}}',
    updated_at = NOW()
WHERE id = (
    SELECT id 
    FROM auth.users 
    WHERE email = '{{customer_email}}'
    LIMIT 1
);

-- Crear perfil si no existe
INSERT INTO profiles (id, username, email, stripe_customer_id, account_balance, is_premium)
SELECT 
    au.id,
    SPLIT_PART(au.email, '@', 1),
    au.email,
    '{{customer}}',
    1000.00,
    true
FROM auth.users au
WHERE au.email = '{{customer_email}}'
AND NOT EXISTS (SELECT 1 FROM profiles WHERE id = au.id);

-- Retornar resultado
SELECT 
    'SUCCESS' as status,
    au.email,
    p.username,
    p.is_premium
FROM auth.users au
JOIN profiles p ON au.id = p.id
WHERE au.email = '{{customer_email}}';
```

### **4. Configuración paso a paso en Make.com:**

#### **Paso A: Webhook de Stripe**
1. Crear webhook que escuche: `invoice.payment_succeeded`
2. Capturar estos campos:
   - `customer_email` 
   - `customer` (ID de Stripe)
   - `amount_paid`

#### **Paso B: Módulo Supabase**
1. **NO uses "Insert/Update Record"** (requiere id)
2. **USA "Execute SQL"** (más flexible)
3. En el SQL, usa `{{customer_email}}` como identificador

#### **Paso C: Variables de Make.com**
```
{{customer_email}}    // Email del usuario
{{customer}}          // ID del customer en Stripe  
{{amount_paid}}       // Cantidad pagada
{{subscription_id}}   // ID de la suscripción
```

### **5. Estructura de webhook de Stripe:**

Asegúrate de que tu webhook capture estos eventos:
- `customer.subscription.created`
- `customer.subscription.updated` 
- `invoice.payment_succeeded`
- `invoice.payment_failed`

### **6. SQL alternativo (más robusto):**

```sql
-- Función que maneja todo automáticamente
SELECT make_user_premium_safe('{{customer_email}}');
```

(Requiere ejecutar primero `fix_make_stripe_integration.sql`)

## 🔧 **Debugging en Make.com:**

### **Test del webhook:**
1. Ve a Stripe Dashboard → Webhooks
2. Encuentra tu webhook
3. Click en "Send test webhook"
4. Verifica que `customer_email` llegue correctamente

### **Verificar en Make.com:**
1. Ve al historial de ejecuciones
2. Verifica que `{{customer_email}}` tenga valor
3. Si está vacío, revisa la configuración del webhook

## 📋 **Checklist de configuración:**

- [ ] Webhook de Stripe configurado correctamente
- [ ] Make.com captura `customer_email` (no `id`)
- [ ] SQL usa `{{customer_email}}` como identificador
- [ ] Tabla `profiles` tiene columna `email`
- [ ] Ejecutado `fix_profiles_with_email.sql`
- [ ] Probado con webhook de test

## 🎯 **Resultado esperado:**
- Usuario identificado por email ✅
- Perfil actualizado a premium ✅
- Sin errores de "id cannot be null" ✅ 