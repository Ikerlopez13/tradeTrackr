#!/usr/bin/env node

// 🔍 Script para verificar usuarios sin perfil en TradeTrackr
// Ejecutar con: node check_missing_profiles.js

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

// Configuración
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Faltan las variables de entorno de Supabase')
  console.error('   NEXT_PUBLIC_SUPABASE_URL=', supabaseUrl ? '✅ OK' : '❌ FALTA')
  console.error('   NEXT_PUBLIC_SUPABASE_ANON_KEY=', supabaseKey ? '✅ OK' : '❌ FALTA')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkMissingProfiles() {
  console.log('🔍 TradeTrackr - Verificador de Perfiles Faltantes')
  console.log('='.repeat(50))
  
  try {
    // 1. Consulta SQL para encontrar usuarios sin perfil
    const { data: missingProfiles, error } = await supabase.rpc('check_missing_profiles_custom', {}, {
      // Fallback: usar consulta directa si no existe la función
    })

    if (error) {
      console.log('⚠️  Usando consulta directa (la función RPC no existe)')
      
      // Consulta alternativa usando FROM
      const { data: authUsers, error: authError } = await supabase
        .from('auth.users') 
        .select('id, email, created_at, email_confirmed_at')
      
      if (authError) {
        console.error('❌ Error accediendo a auth.users:', authError.message)
        console.log('💡 Tip: Este script necesita permisos especiales para acceder a auth.users')
        console.log('   Mejor ejecuta el archivo find_missing_profiles.sql directamente en Supabase SQL Editor')
        return
      }

      // Obtener todos los perfiles existentes
      const { data: existingProfiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id')

      if (profilesError) {
        console.error('❌ Error accediendo a profiles:', profilesError.message)
        return
      }

      const profileIds = new Set(existingProfiles.map(p => p.id))
      
      const usersWithoutProfiles = authUsers.filter(user => !profileIds.has(user.id))
      
      displayResults(authUsers, existingProfiles, usersWithoutProfiles)
    } else {
      console.log('✅ Consulta RPC exitosa')  
      console.log(missingProfiles)
    }

  } catch (err) {
    console.error('❌ Error inesperado:', err.message)
    console.log('\n💡 ALTERNATIVA: Ejecuta find_missing_profiles.sql en Supabase SQL Editor')
  }
}

function displayResults(allUsers, existingProfiles, missingUsers) {
  console.log('\n📊 ESTADÍSTICAS')
  console.log('-'.repeat(30))
  console.log(`👥 Total usuarios en auth:     ${allUsers.length}`)
  console.log(`👤 Usuarios con perfil:        ${existingProfiles.length}`)  
  console.log(`❌ Usuarios SIN perfil:        ${missingUsers.length}`)
  console.log(`📈 Porcentaje con perfil:      ${((existingProfiles.length / allUsers.length) * 100).toFixed(1)}%`)

  if (missingUsers.length === 0) {
    console.log('\n🎉 ¡Perfecto! Todos los usuarios tienen perfil')
    return
  }

  console.log('\n❌ USUARIOS SIN PERFIL')
  console.log('-'.repeat(50))
  
  missingUsers.forEach((user, index) => {
    const daysSinceRegistration = Math.floor((Date.now() - new Date(user.created_at)) / (1000 * 60 * 60 * 24))
    const emailStatus = user.email_confirmed_at ? '✅' : '❌'
    
    console.log(`${index + 1}. ${user.email}`)
    console.log(`   UUID: ${user.id}`)
    console.log(`   Registrado hace: ${daysSinceRegistration} días`)
    console.log(`   Email confirmado: ${emailStatus}`)
    console.log()
  })

  console.log('🔧 PRÓXIMOS PASOS:')
  console.log('1. Ejecuta find_missing_profiles.sql en Supabase SQL Editor')
  console.log('2. Descomenta la sección de INSERT si quieres crear todos los perfiles')
  console.log('3. Verifica que el trigger on_auth_user_created esté funcionando')
}

// Función de ayuda para mostrar información de uso
function showHelp() {
  console.log(`
🔍 TradeTrackr - Verificador de Perfiles Faltantes

USO:
  node check_missing_profiles.js

REQUISITOS:
  - Archivo .env con NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY
  - Node.js y npm install @supabase/supabase-js dotenv

ALTERNATIVA (recomendada):
  Ejecuta find_missing_profiles.sql directamente en Supabase SQL Editor
  para tener acceso completo a auth.users
`)
}

// Verificar argumentos de línea de comandos
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  showHelp()
  process.exit(0)
}

// Ejecutar el script
checkMissingProfiles() 