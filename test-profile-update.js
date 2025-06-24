const { createClient } = require('@supabase/supabase-js')

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Faltan las variables de entorno de Supabase')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testProfileUpdate() {
  console.log('🔍 Probando actualización de perfil...')
  
  try {
    // 1. Obtener usuario actual (esto requiere autenticación)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.log('❌ No hay usuario autenticado. Necesitas hacer login primero.')
      console.log('   Ejecuta este script desde la consola del navegador después de hacer login.')
      return
    }

    console.log('✅ Usuario autenticado:', user.email)

    // 2. Verificar si existe el perfil
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('❌ Error al obtener perfil:', profileError)
      return
    }

    console.log('✅ Perfil actual:', profile)

    // 3. Intentar actualizar el balance
    const newBalance = 5000 // Balance de prueba
    console.log(`🔄 Intentando actualizar balance a $${newBalance}...`)

    const { data: updateData, error: updateError } = await supabase
      .from('profiles')
      .update({ account_balance: newBalance })
      .eq('id', user.id)
      .select()

    if (updateError) {
      console.error('❌ Error al actualizar balance:', updateError)
      console.error('   Código de error:', updateError.code)
      console.error('   Mensaje:', updateError.message)
      console.error('   Detalles:', updateError.details)
      return
    }

    console.log('✅ Balance actualizado exitosamente:', updateData)

    // 4. Verificar que se guardó correctamente
    const { data: verifyProfile, error: verifyError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (verifyError) {
      console.error('❌ Error al verificar actualización:', verifyError)
      return
    }

    console.log('✅ Perfil después de actualización:', verifyProfile)
    
    if (verifyProfile.account_balance === newBalance) {
      console.log('🎉 ¡Balance actualizado correctamente!')
    } else {
      console.log('⚠️ El balance no se actualizó correctamente')
      console.log(`   Esperado: ${newBalance}`)
      console.log(`   Actual: ${verifyProfile.account_balance}`)
    }

  } catch (error) {
    console.error('❌ Error inesperado:', error)
  }
}

// Ejecutar solo si se llama directamente
if (require.main === module) {
  testProfileUpdate()
}

module.exports = { testProfileUpdate } 