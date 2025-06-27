'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Gift } from 'lucide-react'

function SignupForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [referralCode, setReferralCode] = useState('')
  const [referralBonus, setReferralBonus] = useState(false)
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    // Obtener email y código de referido de URL params
    const emailParam = searchParams.get('email')
    const refParam = searchParams.get('ref')
    
    if (emailParam) {
      setEmail(decodeURIComponent(emailParam))
    }
    
    if (refParam) {
      setReferralCode(refParam.toUpperCase())
      setReferralBonus(true)
    }
  }, [searchParams])

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })

      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }

      // Si hay código de referido y el usuario se registró exitosamente
      if (referralCode && data.user) {
        try {
          const response = await fetch('/api/referrals', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ referral_code: referralCode })
          })

          if (response.ok) {
            const result = await response.json()
            if (result.success) {
              // Mostrar mensaje de éxito con recompensa
              setError('')
            }
          }
        } catch (referralError) {
          console.error('Error procesando referido:', referralError)
          // No mostrar error al usuario, el registro fue exitoso
        }
      }

      // Redirigir directamente a la aplicación después del registro exitoso
      router.push('/')
      
    } catch (err) {
      setError('Error inesperado')
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
              Crear cuenta
            </h2>
            <p className="text-gray-400 text-sm">
              Únete a TradeTrackr y comienza tu journey de trading
            </p>
          </div>

          {/* Bonus de referido */}
          {referralBonus && (
            <div className="mb-6 p-4 bg-gradient-to-r from-green-600/20 to-blue-600/20 border border-green-500/30 rounded-lg">
              <div className="flex items-center gap-3">
                <Gift className="w-5 h-5 text-green-400" />
                <div>
                  <p className="text-green-400 font-medium text-sm">¡Bonus de Referido!</p>
                  <p className="text-gray-300 text-xs">Recibirás 3 días Premium gratis al registrarte</p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-4">
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

            <div>
              <label className="block text-white font-medium mb-2 text-sm">
                Confirmar Contraseña
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full p-3 bg-gray-800/60 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none text-sm"
                required
              />
            </div>

            {/* Campo opcional para código de referido */}
            <div>
              <label className="block text-white font-medium mb-2 text-sm">
                Código de Referido (Opcional)
              </label>
              <input
                type="text"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                placeholder="Ej: ABC123"
                className="w-full p-3 bg-gray-800/60 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none text-sm"
                maxLength={6}
              />
              <p className="text-gray-500 text-xs mt-1">
                Si tienes un código de referido, obtendrás días Premium gratis
              </p>
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
              {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
            </button>
          </form>

          <div className="text-center mt-6">
            <p className="text-gray-400 text-sm">
              ¿Ya tienes cuenta?{' '}
              <Link href="/login" className="text-blue-400 hover:text-blue-300 font-medium">
                Inicia sesión aquí
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Signup() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: '#010314'}}>
        <div className="flex flex-col items-center">
          <Image
            src="/logo.jpeg"
            alt="TradeTrackr Logo"
            width={80}
            height={80}
            priority
            unoptimized
            className="rounded-lg animate-scale-cycle"
          />
          <p className="text-white mt-4 text-lg font-medium">Cargando...</p>
        </div>
      </div>
    }>
      <SignupForm />
    </Suspense>
  )
} 