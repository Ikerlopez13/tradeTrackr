'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setError(error.message)
      } else {
        router.push('/')
      }
    } catch (err) {
      setError('Error inesperado')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{backgroundColor: '#010314'}}>
      {/* Header simple con logo */}
      <header className="pt-8 pb-4">
        <div className="flex items-center justify-center px-6">
          <Image
            src="/logo.jpeg"
            alt="TradeTrackr Logo"
            width={48}
            height={48}
            priority
            unoptimized
            className="rounded-lg mr-3 animate-scale-cycle"
          />
          <h1 className="text-2xl font-bold text-white">TradeTrackr</h1>
        </div>
      </header>

      {/* Contenido principal centrado */}
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <h2 className="text-xl font-bold text-white mb-2">
              Bienvenido de vuelta
            </h2>
            <p className="text-gray-400 text-sm">
              Inicia sesión para continuar con tu trading journal
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-white font-medium mb-2 text-sm">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="w-full p-3 bg-gray-800/60 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-white font-medium mb-2 text-sm">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full p-3 bg-gray-800/60 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none text-sm"
                required
              />
            </div>

            {error && (
              <div className="bg-red-600/20 border border-red-600/30 text-red-400 p-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-white text-black font-semibold py-3 px-6 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </button>
          </form>

          <div className="text-center mt-6">
            <p className="text-gray-400 text-sm">
              ¿No tienes cuenta?{' '}
              <Link href="/signup" className="text-blue-400 hover:text-blue-300 font-medium">
                Regístrate aquí
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
} 