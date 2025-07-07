'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import Layout from '@/components/Layout'
import { Trophy } from 'lucide-react'
import { getSafeDisplayName } from '@/utils/userUtils'

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
      const { data: profileData } = await supabase
        .from('profiles')
        .select('username, is_premium')
        .eq('id', user.id)
        .single()
      
      setProfile(profileData)
      
      // Si el usuario no es Premium, redirigir al pricing
      if (!profileData?.is_premium) {
        router.push('/pricing')
      }
      
      setLoading(false)
    }
    getUser()
  }, [router])

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
    <Layout>
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
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
                    <span className="text-gray-400">Usuario:</span>
                    <span className="text-white">{getSafeDisplayName(profile?.username || user?.email || 'Usuario')}</span>
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
    </Layout>
  )
} 