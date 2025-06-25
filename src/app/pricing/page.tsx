'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

export default function PricingPage() {
  const [user, setUser] = useState<any>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    getUser()
  }, [])

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

  const plans = [
    {
      name: 'Gratis',
      description: 'Perfecto para empezar',
      price: 0,
      period: 'siempre',
      icon: '📊',
      features: [
        'Hasta 15 trades gratuitos',
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
        'Análisis avanzado con IA',
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
      price: 5.99,
      period: 'mes',
      icon: '💳',
      features: [
        'Trades ilimitados',
        'Análisis avanzado con IA',
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
            href="/pricing"
            className="text-white font-medium hover:text-gray-300 transition-colors"
          >
            Pricing
          </Link>
          <Link
            href="/profile"
            className="text-gray-400 font-medium hover:text-white transition-colors"
          >
            Perfil
          </Link>
          {user ? (
            <button
              onClick={handleLogout}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              Cerrar Sesión
            </button>
          ) : (
            <>
              <Link
                href="/login"
                className="text-gray-400 font-medium hover:text-white transition-colors"
              >
                Iniciar Sesión
              </Link>
              <Link
                href="/signup"
                className="bg-purple-500/20 hover:bg-purple-500/30 px-3 py-1.5 rounded-lg transition-colors text-white font-medium"
              >
                Registrarse
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <div className="pb-20 md:pb-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12">
          <div className="text-center mb-16">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
              Planes y Precios
            </h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-8">
              Elige el plan perfecto para llevar tu trading al siguiente nivel. 
              Comienza gratis con 15 trades incluidos, sin tarjeta de crédito.
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

          {/* FAQ Section */}
          <div className="mt-24 max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">Preguntas Frecuentes</h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
                <h3 className="text-lg font-semibold mb-3">¿Puedo cambiar de plan en cualquier momento?</h3>
                <p className="text-gray-300">Sí, puedes actualizar o degradar tu plan en cualquier momento desde tu perfil. Los cambios se aplicarán en tu próximo ciclo de facturación.</p>
              </div>
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
                <h3 className="text-lg font-semibold mb-3">¿Los 15 trades gratuitos se renuevan?</h3>
                <p className="text-gray-300">No, los 15 trades gratuitos son únicos por cuenta. Una vez utilizados, necesitarás actualizar a Pro para continuar registrando trades.</p>
              </div>
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
                <h3 className="text-lg font-semibold mb-3">¿Qué métodos de pago aceptan?</h3>
                <p className="text-gray-300">Aceptamos todas las tarjetas de crédito principales, PayPal y transferencias bancarias.</p>
              </div>
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
                <h3 className="text-lg font-semibold mb-3">¿Hay descuentos adicionales?</h3>
                <p className="text-gray-300">El plan anual ya incluye un descuento significativo. También ofrecemos descuentos especiales para estudiantes verificados.</p>
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
                  Comenzar con 15 Trades Gratis
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

      {/* Bottom Navigation Menu - Solo móvil */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 backdrop-blur-sm border-t border-gray-800 z-50" style={{backgroundColor: '#010314'}}>
        <div className="flex justify-around items-center py-2">
          {/* Nuevo Trade */}
          <Link
            href="/"
            className="flex flex-col items-center py-2 px-4 text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6 mb-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            <span className="text-xs font-medium">Nuevo</span>
          </Link>

          {/* Mis Trades */}
          <Link
            href="/trades"
            className="flex flex-col items-center py-2 px-4 text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span className="text-xs font-medium">Trades</span>
          </Link>

          {/* Perfil */}
          <Link
            href="/profile"
            className="flex flex-col items-center py-2 px-4 text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-xs font-medium">Perfil</span>
          </Link>
        </div>
      </nav>
    </div>
  )
} 