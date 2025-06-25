// Script de debug para identificar el error de JSON en la página de perfil
// Ejecutar en la consola del navegador cuando ocurra el error

console.log('🔍 DEBUG - Iniciando diagnóstico del error JSON...')

// 1. Verificar si hay datos corruptos en localStorage
console.log('📦 Verificando localStorage...')
const localStorageKeys = Object.keys(localStorage)
localStorageKeys.forEach(key => {
  try {
    const value = localStorage.getItem(key)
    if (value && value.startsWith('{')) {
      JSON.parse(value)
      console.log(`✅ ${key}: JSON válido`)
    }
  } catch (e) {
    console.error(`❌ ${key}: JSON inválido`, e)
    console.log(`   Valor problemático:`, localStorage.getItem(key))
    // Opcional: limpiar el valor corrupto
    // localStorage.removeItem(key)
  }
})

// 2. Verificar sessionStorage
console.log('📦 Verificando sessionStorage...')
const sessionStorageKeys = Object.keys(sessionStorage)
sessionStorageKeys.forEach(key => {
  try {
    const value = sessionStorage.getItem(key)
    if (value && value.startsWith('{')) {
      JSON.parse(value)
      console.log(`✅ ${key}: JSON válido`)
    }
  } catch (e) {
    console.error(`❌ ${key}: JSON inválido`, e)
    console.log(`   Valor problemático:`, sessionStorage.getItem(key))
    // Opcional: limpiar el valor corrupto
    // sessionStorage.removeItem(key)
  }
})

// 3. Interceptar todas las respuestas fetch para encontrar JSON malformado
const originalFetch = window.fetch
window.fetch = async function(...args) {
  try {
    const response = await originalFetch.apply(this, args)
    
    // Clonar la respuesta para poder leerla múltiples veces
    const clonedResponse = response.clone()
    
    if (response.headers.get('content-type')?.includes('application/json')) {
      try {
        const text = await clonedResponse.text()
        if (text) {
          JSON.parse(text)
          console.log(`✅ Fetch JSON válido para:`, args[0])
        }
      } catch (e) {
        console.error(`❌ Fetch JSON inválido para:`, args[0])
        console.error(`   Error:`, e)
        console.error(`   Respuesta:`, await clonedResponse.text())
      }
    }
    
    return response
  } catch (error) {
    console.error(`❌ Error en fetch:`, args[0], error)
    throw error
  }
}

console.log('🔍 Debug configurado. Recarga la página para capturar errores.')

// 4. Función para limpiar storage si es necesario
function clearCorruptedStorage() {
  console.log('🧹 Limpiando storage corrupto...')
  localStorage.clear()
  sessionStorage.clear()
  console.log('✅ Storage limpiado. Recarga la página.')
}

// 5. Función para probar conexión a Supabase
async function testSupabaseConnection() {
  try {
    console.log('🔍 Probando conexión a Supabase...')
    
    // Esto debe ejecutarse en el contexto de la aplicación donde está disponible supabase
    if (typeof window !== 'undefined' && window.supabase) {
      const { data, error } = await window.supabase.auth.getUser()
      console.log('✅ Supabase auth test:', { data, error })
    } else {
      console.log('⚠️ Supabase no disponible en window. Ejecutar desde la aplicación.')
    }
  } catch (error) {
    console.error('❌ Error probando Supabase:', error)
  }
}

// Exportar funciones útiles
window.debugProfile = {
  clearCorruptedStorage,
  testSupabaseConnection
}

console.log('🎯 Funciones disponibles:')
console.log('   - window.debugProfile.clearCorruptedStorage()')
console.log('   - window.debugProfile.testSupabaseConnection()') 