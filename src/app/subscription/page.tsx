'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Trophy } from 'lucide-react'

export default function SubscriptionPage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      
      if (!user) {
        router.push('/login')
        return
      }
      
      // Obtener el perfil del usuario
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      
      setProfile(profile)
      
      // Si el usuario no es Premium, redirigir al pricing
      if (!profile?.is_premium) {
        router.push('/pricing')
      }
      
      setLoading(false)
    }
    getUser()
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const handleManageSubscription = () => {
    // Enlace al portal de cliente de Stripe
    window.open('https://billing.stripe.com/p/login/test_bIY8xq0P7gKK9RC8ww', '_blank')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: '#010314'}}>
        <Image
          src="/logo.jpeg"
          alt="TradeTrackr Logo"
          width={100}
          height={100}
          priority
          unoptimized
          className="animate-scale-cycle"
        />
      </div>
    )
  }

  if (!user || !profile?.is_premium) {
    return null
  }

  const isPremium = profile?.is_premium || false

  return (
    <div className="min-h-screen text-white" style={{backgroundColor: '#010314'}}>
      {/* Header móvil (solo en pantallas pequeñas) */}
      <header className="md:hidden sticky top-0 z-50 backdrop-blur-sm border-b border-gray-800" style={{backgroundColor: '#010314'}}>
        <div className="flex items-center justify-center py-4 px-6">
          <Image
            src="/logo.jpeg"
            alt="TradeTrackr Logo"
            width={32}
            height={32}
            priority
            unoptimized
            className="rounded-lg mr-3"
          />
          <h1 className="text-lg font-bold text-white">TradeTrackr</h1>
        </div>
      </header>

      {/* Navbar desktop (solo en pantallas grandes) */}
      <nav className="hidden md:flex items-center justify-between px-8 py-4 backdrop-blur-sm border-b border-gray-800" style={{backgroundColor: '#010314'}}>
        <div className="flex items-center">
          <Image
            src="/logo.jpeg"
            alt="TradeTrackr Logo"
            width={40}
            height={40}
            priority
            unoptimized
            className="rounded-lg mr-4"
          />
          <h1 className="text-2xl font-bold text-white">TradeTrackr</h1>
        </div>
        
        <div className="flex items-center space-x-6">
          <Link
            href="/"
            className="text-gray-400 font-medium hover:text-white transition-colors"
          >
            Nuevo Trade
          </Link>
          <Link
            href="/trades"
            className="text-gray-400 font-medium hover:text-white transition-colors"
          >
            Mis Trades
          </Link>
          <Link
            href="/feed"
            className="text-gray-400 font-medium hover:text-white transition-colors"
          >
            Feed
          </Link>
          <Link
            href="/referrals"
            className="text-gray-400 font-medium hover:text-white transition-colors flex items-center gap-1"
          >
            Referidos
          </Link>
          <Link
            href="/subscription"
            className="text-white font-medium hover:text-gray-300 transition-colors"
          >
            Suscripción
          </Link>
          <Link
            href="/profile"
            className="text-gray-400 font-medium hover:text-white transition-colors"
          >
            Perfil
          </Link>
          <Link
            href="/leaderboards"
            className="bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-400 border border-yellow-500/30 px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
          >
            <Trophy className="w-4 h-4" />
            <span>Leaderboards</span>
          </Link>
          <button
            onClick={handleLogout}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Cerrar Sesión
          </button>
        </div>
      </nav>

      {/* Contenido principal */}
      <div className="pb-20 md:pb-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center mb-4">
              <span className="text-4xl mr-3">⭐</span>
              <h1 className="text-4xl md:text-5xl font-bold text-yellow-400">
                Premium Activo
              </h1>
            </div>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Gestiona tu suscripción Premium y aprovecha al máximo todas las funcionalidades de TradeTrackr
            </p>
          </div>

          {/* Estado de la suscripción */}
          <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 backdrop-blur-sm rounded-2xl p-8 border border-yellow-500/30 mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-2xl font-bold">PRO</span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Plan Premium</h2>
                  <p className="text-yellow-300">Suscripción activa</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-yellow-400">$5.99</div>
                <div className="text-gray-400 text-sm">por mes</div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-black/20 rounded-xl p-6">
                <h3 className="text-white font-semibold mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Beneficios Activos
                </h3>
                <ul className="space-y-2 text-gray-300 text-sm">
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-green-400 rounded-full mr-3"></span>
                    Trades ilimitados
                  </li>
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-green-400 rounded-full mr-3"></span>
                    Análisis avanzado con IA
                  </li>
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-green-400 rounded-full mr-3"></span>
                    Reportes detallados PDF
                  </li>
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-green-400 rounded-full mr-3"></span>
                    Eliminación masiva de trades
                  </li>
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-green-400 rounded-full mr-3"></span>
                    Soporte prioritario
                  </li>
                </ul>
              </div>

              <div className="bg-black/20 rounded-xl p-6">
                <h3 className="text-white font-semibold mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Información de Cuenta
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Email:</span>
                    <span className="text-white">{user.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Estado:</span>
                    <span className="text-green-400 font-medium">Activo</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Próximo cobro:</span>
                    <span className="text-white">Automático</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Gestión de suscripción */}
          <div className="grid md:grid-cols-2 gap-8">
            {/* Gestionar facturación */}
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-500/20 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Gestionar Facturación</h3>
                <p className="text-gray-400 mb-6 text-sm">
                  Actualiza tu método de pago, ve tu historial de facturas y gestiona tu suscripción
                </p>
                <button
                  onClick={handleManageSubscription}
                  className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-500 transition-colors font-medium"
                >
                  Abrir Portal de Facturación
                </button>
              </div>
            </div>

            {/* Soporte Premium */}
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-500/20 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Soporte Premium</h3>
                <p className="text-gray-400 mb-6 text-sm">
                  Accede a soporte prioritario y ayuda especializada para usuarios Premium
                </p>
                <a
                  href="mailto:tradetrackr.office@gmail.com?subject=Soporte Premium - TradeTrackr"
                  className="w-full bg-yellow-600 text-white py-3 px-6 rounded-lg hover:bg-yellow-500 transition-colors font-medium inline-block text-center"
                >
                  Contactar Soporte Premium
                </a>
              </div>
            </div>
          </div>

          {/* Información adicional */}
          <div className="mt-12 bg-gray-800/30 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
            <h3 className="text-white font-semibold mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Información Importante
            </h3>
            <div className="grid md:grid-cols-2 gap-6 text-sm text-gray-300">
              <div>
                <h4 className="text-white font-medium mb-2">Cancelación</h4>
                <p>Puedes cancelar tu suscripción en cualquier momento desde el portal de facturación. Mantendrás el acceso Premium hasta el final de tu período de facturación actual.</p>
              </div>
              <div>
                <h4 className="text-white font-medium mb-2">Cambios de Plan</h4>
                <p>Los cambios de plan se aplicarán inmediatamente. Si cambias a un plan más caro, se prorrateará la diferencia.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation Menu - Solo móvil */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 backdrop-blur-sm border-t border-gray-800 z-50" style={{backgroundColor: '#010314'}}>
        <div className="flex justify-around items-center py-2">
          {/* Nuevo Trade */}
          <Link
            href="/"
            className="flex flex-col items-center py-1 px-2 text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5 mb-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            <span className="text-xs font-medium">Nuevo</span>
          </Link>

          {/* Mis Trades */}
          <Link
            href="/trades"
            className="flex flex-col items-center py-1 px-2 text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span className="text-xs font-medium">Trades</span>
          </Link>

          {/* Suscripción - Página actual */}
          <Link
            href="/subscription"
            className="flex flex-col items-center py-1 px-2 text-white"
          >
            <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 713.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 713.138-3.138z" />
            </svg>
            <span className="text-xs font-medium">Suscripción</span>
          </Link>

          {/* Perfil */}
          <Link
            href="/profile"
            className="flex flex-col items-center py-1 px-2 text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-xs font-medium">Perfil</span>
          </Link>

          {/* Leaderboards */}
          <Link
            href="/leaderboards"
            className="flex flex-col items-center py-1 px-2 text-yellow-400 hover:text-yellow-300 transition-colors"
          >
            <Trophy className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium">Ranking</span>
          </Link>

          {/* Feed */}
          <Link
            href="/feed"
            className="flex flex-col items-center py-1 px-2 text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-xs font-medium">Feed</span>
          </Link>
        </div>
      </nav>
    </div>
  )
} 