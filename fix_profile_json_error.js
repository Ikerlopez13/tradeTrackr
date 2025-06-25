// Fix rápido para el error JSON en la página de perfil
// Ejecutar en la consola del navegador o agregar al código

// 1. Limpiar cache de Next.js que puede estar corrupto
console.log('🧹 Limpiando cache de Next.js...')
if (typeof window !== 'undefined') {
  // Limpiar localStorage de Next.js
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith('nextjs') || key.startsWith('__next')) {
      localStorage.removeItem(key)
      console.log(`Removed: ${key}`)
    }
  })
  
  // Limpiar sessionStorage
  Object.keys(sessionStorage).forEach(key => {
    if (key.startsWith('nextjs') || key.startsWith('__next')) {
      sessionStorage.removeItem(key)
      console.log(`Removed: ${key}`)
    }
  })
}

// 2. Función para hacer requests seguros a Supabase
async function safeSupabaseRequest(queryFn, fallbackValue = null) {
  try {
    const result = await queryFn()
    
    // Verificar si la respuesta es válida
    if (result && typeof result === 'object') {
      return result
    }
    
    console.warn('Respuesta inválida de Supabase:', result)
    return { data: fallbackValue, error: null }
  } catch (error) {
    console.error('Error en request a Supabase:', error)
    return { data: fallbackValue, error }
  }
}

// 3. Función para recrear perfil si no existe
async function ensureProfileExists(userId, email) {
  try {
    console.log('🔍 Verificando si existe perfil para:', userId)
    
    // Usar el cliente de Supabase de la aplicación
    const supabase = window.__supabase || window.supabase
    if (!supabase) {
      console.error('❌ Supabase client no disponible')
      return false
    }
    
    // Verificar si existe el perfil
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    
    if (profileError && profileError.code === 'PGRST116') {
      // No existe el perfil, crearlo
      console.log('🚨 Perfil no existe, creando...')
      
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          username: email.split('@')[0],
          account_balance: 1000.00,
          is_premium: false
        })
        .select()
        .single()
      
      if (createError) {
        console.error('❌ Error creando perfil:', createError)
        return false
      }
      
      console.log('✅ Perfil creado:', newProfile)
      return true
    } else if (profileError) {
      console.error('❌ Error consultando perfil:', profileError)
      return false
    }
    
    console.log('✅ Perfil existe:', profile)
    return true
  } catch (error) {
    console.error('❌ Error en ensureProfileExists:', error)
    return false
  }
}

// 4. Función para limpiar y reiniciar la aplicación
function resetApp() {
  console.log('🔄 Reiniciando aplicación...')
  
  // Limpiar todo el storage
  localStorage.clear()
  sessionStorage.clear()
  
  // Recargar la página
  window.location.reload()
}

// 5. Función de diagnóstico completo
async function diagnoseApp() {
  console.log('🔍 Iniciando diagnóstico completo...')
  
  try {
    // Verificar autenticación
    const supabase = window.__supabase || window.supabase
    if (!supabase) {
      console.error('❌ Supabase no disponible')
      return
    }
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError) {
      console.error('❌ Error de autenticación:', authError)
      return
    }
    
    if (!user) {
      console.log('⚠️ Usuario no autenticado')
      return
    }
    
    console.log('✅ Usuario autenticado:', user.email)
    
    // Verificar/crear perfil
    const profileExists = await ensureProfileExists(user.id, user.email)
    
    if (profileExists) {
      console.log('✅ Perfil verificado/creado correctamente')
    } else {
      console.error('❌ No se pudo verificar/crear el perfil')
    }
    
  } catch (error) {
    console.error('❌ Error en diagnóstico:', error)
  }
}

// Exportar funciones útiles
if (typeof window !== 'undefined') {
  window.profileFix = {
    safeSupabaseRequest,
    ensureProfileExists,
    resetApp,
    diagnoseApp
  }
  
  console.log('🎯 Funciones de fix disponibles:')
  console.log('   - window.profileFix.diagnoseApp() - Diagnóstico completo')
  console.log('   - window.profileFix.resetApp() - Reiniciar app')
  console.log('   - window.profileFix.ensureProfileExists(userId, email) - Crear perfil')
} 