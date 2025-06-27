# 🎁 Sistema de Referidos - TradeTrackr

## Resumen del Sistema

El sistema de referidos de TradeTrackr permite a los usuarios invitar amigos y ganar recompensas Premium mutuas. Es un sistema completo con códigos únicos, niveles de recompensas, y dashboard de gestión.

## 🚀 Características Principales

### ✅ Funcionalidades Implementadas

1. **Códigos de Referido Únicos**
   - Generación automática de códigos de 6 caracteres
   - Códigos únicos para cada usuario
   - Asignación automática al crear perfil

2. **Sistema de Recompensas Multi-Nivel**
   - **Nivel 1 - Principiante**: 3 días Premium (referidor y referido)
   - **Nivel 2 - Embajador**: 7 días Premium (5+ referidos)
   - **Nivel 3 - Leyenda**: 15 días Premium (10+ referidos)

3. **Dashboard Completo**
   - Estadísticas de referidos
   - Link personalizado para compartir
   - Lista de referidos activos
   - Recompensas pendientes
   - Progreso de niveles

4. **Integración con Registro**
   - Captura automática de códigos desde URL
   - Pre-llenado de formularios
   - Procesamiento automático de recompensas

5. **APIs RESTful**
   - `/api/referrals` - Dashboard y procesamiento
   - `/api/referrals/claim` - Reclamar recompensas

## 📁 Archivos Creados

```
src/
├── types/referrals.ts              # Tipos TypeScript
├── app/
│   ├── api/referrals/
│   │   ├── route.ts               # API principal
│   │   └── claim/route.ts         # API reclamar recompensas
│   └── referrals/page.tsx         # Dashboard de referidos
├── lib/supabase/
│   ├── client.ts                  # Cliente Supabase
│   └── server.ts                  # Servidor Supabase
└── components/
    └── (integrado en signup y navegación)

setup_referrals.sql                # Script de base de datos
```

## 🗄️ Configuración de Base de Datos

### 1. Ejecutar Script SQL

```sql
-- Ejecutar en Supabase SQL Editor
-- El archivo setup_referrals.sql contiene todo lo necesario
```

### 2. Tablas Creadas

- `referral_config` - Configuración de niveles
- `referrals` - Registro de referidos
- `referral_rewards` - Recompensas individuales
- `referral_stats` (vista) - Estadísticas agregadas

### 3. Funciones de Base de Datos

- `generate_referral_code()` - Genera códigos únicos
- `process_referral()` - Procesa nuevos referidos
- `claim_referral_reward()` - Reclama recompensas

## 🔧 Configuración del Proyecto

### 1. Variables de Entorno

```env
NEXT_PUBLIC_APP_URL=https://tradetrackr.pro  # URL base para links
NEXT_PUBLIC_SUPABASE_URL=tu_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_supabase_anon_key
```

### 2. Dependencias Instaladas

```bash
npm install lucide-react  # Iconos para UI
```

## 💻 Uso del Sistema

### Para Usuarios

1. **Obtener Código de Referido**
   - Ir a `/referrals`
   - Copiar link personalizado
   - Compartir con amigos

2. **Registrarse con Código**
   - Usar link: `app.com/signup?ref=ABC123`
   - O ingresar código manualmente en registro

3. **Reclamar Recompensas**
   - Ver recompensas pendientes en dashboard
   - Hacer clic en "Reclamar"
   - Días Premium se agregan automáticamente

### Para Desarrolladores

#### API Endpoints

```typescript
// GET /api/referrals - Obtener dashboard
const response = await fetch('/api/referrals');
const data: ReferralDashboardData = await response.json();

// POST /api/referrals - Procesar referido
const response = await fetch('/api/referrals', {
  method: 'POST',
  body: JSON.stringify({ referral_code: 'ABC123' })
});

// POST /api/referrals/claim - Reclamar recompensa
const response = await fetch('/api/referrals/claim', {
  method: 'POST',
  body: JSON.stringify({ reward_id: 'uuid' })
});
```

#### Tipos TypeScript

```typescript
import { 
  ReferralDashboardData,
  ProcessReferralRequest,
  ClaimRewardRequest 
} from '@/types/referrals';
```

## 🎯 Flujo de Usuario

### 1. Usuario Existente (Referidor)
```
Dashboard → Copiar Link → Compartir → Ganar Recompensas
```

### 2. Nuevo Usuario (Referido)
```
Link Compartido → Registro → Recompensa Automática → Activación Premium
```

### 3. Procesamiento Automático
```
Registro → Validar Código → Crear Referido → Generar Recompensas → Notificar Usuarios
```

## 🛡️ Seguridad

### Row Level Security (RLS)
- Usuarios solo ven sus propios referidos
- Recompensas protegidas por usuario
- Configuración de solo lectura

### Validaciones
- No auto-referidos
- Un usuario solo puede ser referido una vez
- Verificación de códigos válidos
- Límites por nivel

## 📊 Métricas Disponibles

### Dashboard de Usuario
- Total de referidos activos
- Recompensas ganadas y pendientes
- Días Premium acumulados
- Progreso hacia siguiente nivel

### Estadísticas del Sistema
- Referidos por usuario
- Tasa de conversión
- Recompensas reclamadas vs pendientes
- Distribución por niveles

## 🔄 Flujo de Datos

```mermaid
graph TD
    A[Usuario comparte link] --> B[Nuevo usuario hace clic]
    B --> C[Registro con código pre-llenado]
    C --> D[process_referral() función]
    D --> E[Crear registro en referrals]
    E --> F[Generar recompensas para ambos]
    F --> G[Actualizar contadores]
    G --> H[Notificar usuarios]
```

## 🧪 Testing

### Casos de Prueba

1. **Registro Normal**
   ```
   1. Crear usuario sin código → ✅ Genera código automático
   2. Verificar código único → ✅ No duplicados
   ```

2. **Proceso de Referido**
   ```
   1. Usar código válido → ✅ Crea referido y recompensas
   2. Usar código inválido → ❌ Error apropiado
   3. Auto-referirse → ❌ Bloqueado
   4. Doble referido → ❌ Un usuario solo una vez
   ```

3. **Reclamar Recompensas**
   ```
   1. Recompensa válida → ✅ Actualiza Premium
   2. Recompensa ya reclamada → ❌ Error
   3. Recompensa de otro usuario → ❌ Bloqueado
   ```

## 🚀 Despliegue

### 1. Base de Datos
```sql
-- Ejecutar setup_referrals.sql en producción
-- Verificar que todas las tablas y funciones estén creadas
```

### 2. Variables de Entorno
```bash
# Actualizar URL de producción
NEXT_PUBLIC_APP_URL=https://tradetrackr.pro
```

### 3. Verificación
```bash
# Verificar que las APIs respondan
curl https://tradetrackr.pro/api/referrals
```

## 🎨 Personalización

### Modificar Recompensas
```sql
-- Actualizar configuración de niveles
UPDATE referral_config 
SET referrer_reward_value = 5 
WHERE tier = 1;
```

### Cambiar Textos
```typescript
// En src/app/referrals/page.tsx
const messages = {
  welcome: "¡Bienvenido al programa de referidos!",
  claim: "Reclamar recompensa"
};
```

## 📈 Roadmap Futuro

### Mejoras Potenciales
- [ ] Sistema de cupones personalizados
- [ ] Recompensas en efectivo
- [ ] Referidos de segundo nivel
- [ ] Analytics avanzados
- [ ] Integración con email marketing
- [ ] Gamificación con badges
- [ ] Leaderboard de referidores

## 🆘 Soporte

### Problemas Comunes

1. **Código no funciona**
   - Verificar que existe en base de datos
   - Revisar mayúsculas/minúsculas
   - Confirmar que no haya espacios

2. **Recompensas no aparecen**
   - Verificar que el referido se procesó
   - Revisar logs de la función process_referral
   - Confirmar RLS policies

3. **No se puede reclamar**
   - Verificar que la recompensa no esté reclamada
   - Confirmar que pertenece al usuario
   - Revisar función claim_referral_reward

### Logs Útiles
```sql
-- Ver referidos recientes
SELECT * FROM referrals ORDER BY created_at DESC LIMIT 10;

-- Ver recompensas pendientes
SELECT * FROM referral_rewards WHERE claimed = false;

-- Estadísticas generales
SELECT * FROM referral_stats;
```

---

## ✅ Sistema Completado

El sistema de referidos está **100% funcional** y listo para producción. Incluye:

- ✅ Base de datos completa con seguridad
- ✅ APIs funcionales con validación
- ✅ Dashboard interactivo y responsive
- ✅ Integración con registro
- ✅ Navegación en desktop y móvil
- ✅ Tipos TypeScript completos
- ✅ Documentación exhaustiva

**¡El sistema está listo para generar crecimiento orgánico en TradeTrackr!** 🚀 