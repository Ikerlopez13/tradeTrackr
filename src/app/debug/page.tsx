'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function DebugPage() {
  const [status, setStatus] = useState<string>('Iniciando...')
  const [user, setUser] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const testApp = async () => {
      try {
        setStatus('Creando cliente Supabase...')
        const supabase = createClient()
        
        setStatus('Obteniendo usuario...')
        const { data: { user }, error } = await supabase.auth.getUser()
        
        if (error) {
          setError(`Error de auth: ${error.message}`)
          setStatus('Error en autenticación')
        } else {
          setUser(user)
          setStatus(user ? `Usuario autenticado: ${user.email}` : 'No hay usuario autenticado')
        }
      } catch (err) {
        setError(`Error inesperado: ${(err as Error).message}`)
        setStatus('Error inesperado')
      }
    }

    testApp()
  }, [])

  return (
    <div style={{backgroundColor: '#010314', minHeight: '100vh', padding: '20px', color: 'white'}}>
      <h1>🔍 Debug TradeTrackr</h1>
      
      <div style={{marginTop: '20px'}}>
        <h2>Estado actual:</h2>
        <p style={{color: error ? 'red' : 'green'}}>{status}</p>
        
        {error && (
          <div style={{backgroundColor: 'rgba(255,0,0,0.1)', padding: '10px', marginTop: '10px', borderRadius: '5px'}}>
            <strong>Error:</strong> {error}
          </div>
        )}
        
        {user && (
          <div style={{backgroundColor: 'rgba(0,255,0,0.1)', padding: '10px', marginTop: '10px', borderRadius: '5px'}}>
            <strong>Usuario:</strong>
            <pre>{JSON.stringify(user, null, 2)}</pre>
          </div>
        )}
        
        <div style={{marginTop: '20px'}}>
          <h3>Información del entorno:</h3>
          <p>NODE_ENV: {process.env.NODE_ENV}</p>
          <p>Supabase URL configurada: {process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Sí' : '❌ No'}</p>
          <p>Supabase Key configurada: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Sí' : '❌ No'}</p>
        </div>
        
        <div style={{marginTop: '20px'}}>
          <h3>Enlaces de navegación:</h3>
          <p><a href="/" style={{color: 'cyan'}}>← Volver a la página principal</a></p>
          <p><a href="/login" style={{color: 'cyan'}}>Ir a Login</a></p>
          <p><a href="/signup" style={{color: 'cyan'}}>Ir a Signup</a></p>
        </div>
      </div>
    </div>
  )
} 