'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Trophy } from 'lucide-react'
import Layout from '@/components/Layout'

export default function PricingPage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      
      if (user) {
        // Obtener el perfil del usuario para verificar si es Premium
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_premium')
          .eq('id', user.id)
          .single()
        setProfile(profile)
        
        // Si el usuario es Premium, redirigir al perfil
        if (profile?.is_premium) {
          router.push('/profile')
        }
      }
    }
    getUser()
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // Función para manejar los clics de los botones de pricing
  const handlePlanClick = (planName: string) => {
    if (planName === 'Pro Mensual') {
      // Redirigir al enlace de Stripe para el plan mensual con email pre-rellenado
      const email = user?.email || ''
      const stripeUrl = `https://buy.stripe.com/cNidRa8XtdYN94G31EaR207${email ? `?prefilled_email=${encodeURIComponent(email)}` : ''}`
      window.open(stripeUrl, '_blank')
    } else if (planName === 'Gratis') {
      // Redirigir al registro
      router.push('/signup')
    } else if (planName === 'Pro Anual') {
      // Redirigir al enlace de Stripe para el plan anual con email pre-rellenado
      const email = user?.email || ''
      const stripeUrl = `https://buy.stripe.com/4gM28sc9F2g5dkWeKmaR20b${email ? `?prefilled_email=${encodeURIComponent(email)}` : ''}`
      window.open(stripeUrl, '_blank')
    }
  }

  const isPremium = profile?.is_premium || false

  const plans = [
    {
      name: 'Gratis',
      description: 'Perfecto para empezar',
      price: 0,
      period: 'siempre',
      icon: '📊',
      features: [
        'Hasta 3 trades gratuitos',
        'Análisis básico de rendimiento',
        'Subida de screenshots',
        'Estadísticas básicas',
        'Soporte por email'
      ],
      popular: false,
      buttonText: 'Comenzar Gratis',
      buttonStyle: 'bg-white/10 hover:bg-white/20 border border-white/20'
    },
    {
      name: 'Pro Anual',
      description: 'El más elegido por traders',
      price: 49.99,
      period: 'año',
      savings: 'Ahorra $22/año',
      icon: '🚀',
      features: [
        'Trades ilimitados',
        'Badge de verificación ✓',
        'Consejos de IA ilimitados',
        'Editar y borrar trades',
        'Ser anfitrión de grupos',
        'Reportes detallados PDF',
        'Alertas personalizadas',
        'Integración con brokers',
        'Backtesting avanzado',
        'Soporte prioritario'
      ],
      popular: true,
      buttonText: 'Comenzar Pro Anual',
      buttonStyle: 'bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600'
    },
    {
      name: 'Pro Mensual',
      description: 'Flexibilidad mes a mes',
      price: 9.99,
      period: 'mes',
      icon: '💳',
      features: [
        'Trades ilimitados',
        'Badge de verificación ✓',
        'Consejos de IA ilimitados',
        'Editar y borrar trades',
        'Ser anfitrión de grupos',
        'Reportes detallados PDF',
        'Alertas personalizadas',
        'Integración con brokers',
        'Backtesting avanzado',
        'Soporte prioritario'
      ],
      popular: false,
      buttonText: 'Comenzar Pro Mensual',
      buttonStyle: 'bg-white/10 hover:bg-white/20 border border-white/20'
    }
  ]

  return (
    <Layout>
      {/* Hero Section */}
      <div className="pb-20 md:pb-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12">
          <div className="text-center mb-16">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
              Planes y Precios
            </h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-8">
              Elige el plan perfecto para llevar tu trading al siguiente nivel. 
              Comienza gratis con 3 trades incluidos, sin tarjeta de crédito.
            </p>
          </div>

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {plans.map((plan, index) => (
              <div
                key={plan.name}
                className={`relative rounded-2xl p-8 backdrop-blur-sm border transition-all duration-300 hover:scale-105 hover:border-purple-500/50 ${
                  plan.popular
                    ? 'bg-gradient-to-b from-purple-500/10 to-blue-500/10 border-purple-500/30 scale-105'
                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <div className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                      Más Popular
                    </div>
                  </div>
                )}

                <div className="text-center mb-8">
                  <div className="text-4xl mb-4">{plan.icon}</div>
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <p className="text-gray-400 mb-6">{plan.description}</p>
                  
                  <div className="mb-6">
                    <div className="flex items-baseline justify-center">
                      <span className="text-5xl font-bold">
                        ${plan.price}
                      </span>
                      <span className="text-gray-400 ml-2">
                        /{plan.period}
                      </span>
                    </div>
                    {plan.savings && (
                      <div className="text-sm text-green-400 mt-2 font-medium">
                        {plan.savings}
                      </div>
                    )}
                    {plan.name === 'Pro Anual' && (
                      <div className="text-sm text-gray-400 mt-1">
                        Solo $4.17/mes
                      </div>
                    )}
                  </div>
                </div>

                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start">
                      <svg className="w-5 h-5 text-green-400 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  className={`w-full py-4 px-6 rounded-xl font-semibold text-white transition-all duration-200 transform hover:scale-105 ${plan.buttonStyle}`}
                  onClick={() => handlePlanClick(plan.name)}
                >
                  {plan.buttonText}
                </button>
              </div>
            ))}
          </div>

          {/* Premium Features Highlight */}
          <div className="mt-16 bg-gradient-to-r from-purple-500/10 to-blue-500/10 backdrop-blur-sm rounded-2xl p-8 border border-purple-500/30">
            <div className="text-center">
              <h3 className="text-2xl font-bold mb-4 text-white">🎯 Características Exclusivas Premium</h3>
              <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                  <div className="flex items-center mb-3">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center mr-3">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <h4 className="text-lg font-semibold text-white">Badge de Verificación</h4>
                  </div>
                  <p className="text-gray-300 text-sm">Obtén el badge azul ✓ que aparece junto a tu nombre en el feed y te identifica como trader Premium.</p>
                </div>
                <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                  <div className="flex items-center mb-3">
                    <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center mr-3">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <h4 className="text-lg font-semibold text-white">Anfitrión de Grupos</h4>
                  </div>
                  <p className="text-gray-300 text-sm">Solo los usuarios Premium pueden crear y ser anfitriones de grupos privados de trading.</p>
                </div>
              </div>
            </div>
          </div>

          {/* FAQ Section */}
          <div className="mt-24 max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">Preguntas Frecuentes</h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
                <h3 className="text-lg font-semibold mb-3">¿Puedo cambiar de plan en cualquier momento?</h3>
                <p className="text-gray-300">Sí, puedes actualizar o degradar tu plan en cualquier momento desde tu perfil. Los cambios se aplicarán en tu próximo ciclo de facturación.</p>
              </div>
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
                <h3 className="text-lg font-semibold mb-3">¿Los 3 trades gratuitos se renuevan?</h3>
                <p className="text-gray-300">No, los 3 trades gratuitos son únicos por cuenta. Una vez utilizados, necesitarás actualizar a Pro para continuar registrando trades.</p>
              </div>
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
                <h3 className="text-lg font-semibold mb-3">¿Solo los usuarios Premium pueden crear grupos?</h3>
                <p className="text-gray-300">Sí, solo los usuarios Premium pueden ser anfitriones y crear grupos privados. Los usuarios gratuitos pueden unirse a grupos existentes.</p>
              </div>
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
                <h3 className="text-lg font-semibold mb-3">¿Qué métodos de pago aceptan?</h3>
                <p className="text-gray-300">Aceptamos todas las tarjetas de crédito principales, PayPal y transferencias bancarias.</p>
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <div className="mt-24 text-center">
            <div className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 backdrop-blur-sm rounded-2xl p-12 border border-purple-500/30">
              <h2 className="text-3xl font-bold mb-4">¿Listo para mejorar tu trading?</h2>
              <p className="text-xl text-gray-300 mb-8">
                Únete a miles de traders que ya están mejorando sus resultados con TradeTrackr
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/signup"
                  className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 px-8 py-4 rounded-xl font-semibold text-white transition-all duration-200 transform hover:scale-105"
                >
                  Comenzar con 3 Trades Gratis
                </Link>
                <Link
                  href="/"
                  className="bg-white/10 hover:bg-white/20 border border-white/20 px-8 py-4 rounded-xl font-semibold text-white transition-all duration-200"
                >
                  Ver Demo
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
} 