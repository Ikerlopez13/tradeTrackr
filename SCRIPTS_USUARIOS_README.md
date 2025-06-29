# 🔍 Scripts para Usuarios Sin Perfil - TradeTrackr

## Problema
Los usuarios se registran en Supabase Auth pero no se crean automáticamente en la tabla `profiles`, causando errores en la aplicación.

## 📁 Scripts Disponibles

### 1. `find_missing_profiles.sql` - 🔍 DIAGNÓSTICO
**Propósito**: Identificar usuarios sin perfil  
**Uso**: Copiar y pegar en Supabase SQL Editor  
**Lo que hace**:
- Lista usuarios que están en `auth.users` pero no en `profiles`
- Muestra estadísticas de usuarios sin perfil
- Verifica el estado del trigger automático
- **NO modifica datos**, solo consulta

### 2. `create_missing_profiles_bulk.sql` - 🛠️ CREAR PERFILES
**Propósito**: Crear perfiles faltantes en lote  
**Uso**: Ejecutar en Supabase SQL Editor (después de revisar `find_missing_profiles.sql`)  
**Lo que hace**:
- Crea perfiles para TODOS los usuarios que no los tengan
- Crea registros en `user_stats` también
- Balance inicial: $1000.00
- **⚠️ MODIFICA LA BASE DE DATOS**

### 3. `fix_profile_trigger.sql` - 🔧 ARREGLAR TRIGGER
**Propósito**: Corregir el trigger de creación automática  
**Uso**: Ejecutar en Supabase SQL Editor  
**Lo que hace**:
- Elimina y recrea el trigger `on_auth_user_created`
- Mejora la función `handle_new_user()`
- Agrega logs para debugging
- Verifica que funcione correctamente

### 4. `check_missing_profiles.js` - 🖥️ SCRIPT NODE.JS
**Propósito**: Verificar desde línea de comandos  
**Uso**: `node check_missing_profiles.js`  
**Lo que hace**:
- Alternativa en JavaScript para el diagnóstico
- Requiere variables de entorno configuradas
- **Limitado**: No puede acceder a `auth.users` sin permisos especiales

## 🚀 Guía de Uso Paso a Paso

### Paso 1: Diagnóstico
```sql
-- Ejecutar en Supabase SQL Editor
-- Copiar todo el contenido de find_missing_profiles.sql
```
Esto te mostrará:
- Cuántos usuarios no tienen perfil
- Lista de emails afectados
- Estado del trigger automático

### Paso 2: Crear Perfiles Faltantes (Opcional)
```sql
-- Ejecutar en Supabase SQL Editor
-- Copiar todo el contenido de create_missing_profiles_bulk.sql
```
⚠️ **PRECAUCIÓN**: Este script modificará tu base de datos

### Paso 3: Arreglar el Trigger (Recomendado)
```sql
-- Ejecutar en Supabase SQL Editor  
-- Copiar todo el contenido de fix_profile_trigger.sql
```
Esto asegura que futuros usuarios tengan perfiles automáticamente.

### Paso 4: Verificar (Opcional)
```bash
# Desde la terminal en tu proyecto
node check_missing_profiles.js
```

## 🔧 Configuración Requerida

### Para Scripts SQL:
- Acceso al Supabase SQL Editor
- Permisos de administrador en tu proyecto

### Para Script Node.js:
```bash
# Instalar dependencias
npm install @supabase/supabase-js dotenv

# Variables de entorno en .env
NEXT_PUBLIC_SUPABASE_URL=tu_url_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
```

## ❓ Preguntas Frecuentes

**P: ¿Por qué no se crean perfiles automáticamente?**  
R: Puede ser que el trigger `on_auth_user_created` esté deshabilitado o con errores. Ejecuta `fix_profile_trigger.sql`.

**P: ¿Es seguro ejecutar create_missing_profiles_bulk.sql?**  
R: Sí, usa `ON CONFLICT DO UPDATE` para evitar duplicados, pero siempre revisa antes los resultados de `find_missing_profiles.sql`.

**P: ¿Qué balance inicial se asigna?**  
R: $1000.00 por defecto. Puedes cambiar esto en los scripts antes de ejecutar.

**P: ¿Funcionará con mi estructura de base de datos?**  
R: Los scripts asumen las tablas `profiles` y `user_stats` como están en tu `supabase_setup.sql`. Si tienes columnas diferentes, ajusta los scripts.

## 🆘 Solución de Problemas

### Error: "permission denied for table auth.users"
- **Solución**: Ejecutar los scripts SQL en Supabase SQL Editor, no desde la aplicación
- Los scripts SQL tienen permisos de administrador

### Error: "column does not exist"
- **Solución**: Verificar que las tablas tengan las columnas esperadas
- Revisar tu `supabase_setup.sql` para confirmar estructura

### Trigger no funciona después de arreglar
- **Solución**: Verificar que RLS esté configurado correctamente
- Revisar logs en Supabase para errores específicos

## 📞 Soporte
Si estos scripts no resuelven tu problema:
1. Revisa los logs en Supabase Dashboard > Logs
2. Verifica que las tablas `profiles` y `user_stats` existan
3. Confirma que el trigger `on_auth_user_created` esté activo
4. Verifica las políticas RLS en las tablas

---
*Scripts creados para solucionar el problema de usuarios registrados sin perfiles en TradeTrackr* 