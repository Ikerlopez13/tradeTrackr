'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

export default function Home() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [confidence, setConfidence] = useState(55)
  const [selectedBias, setSelectedBias] = useState('')
  const [selectedResult, setSelectedResult] = useState('')
  const [formData, setFormData] = useState({
    title: '',
    timeframe: '',
    pair: '',
    session: '',
    riskReward: '',
    description: ''
  })
  
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      setLoading(false)
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null)
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase.auth])

  const getConfidenceEmoji = (value: number) => {
    if (value <= 33) return '😞'
    if (value <= 66) return '🤔'
    return '😊'
  }

  const getConfidenceText = (value: number) => {
    if (value <= 33) return 'Mal'
    if (value <= 66) return 'Regular'
    return 'Genial'
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('trades')
        .insert({
          user_id: user.id,
          title: formData.title,
          pair: formData.pair,
          timeframe: formData.timeframe,
          session: formData.session,
          bias: selectedBias,
          risk_reward: formData.riskReward,
          result: selectedResult,
          feeling: confidence,
          description: formData.description
        })

      if (error) {
        console.error('Error al guardar trade:', error)
        alert('Error al guardar el trade')
      } else {
        alert('¡Trade guardado exitosamente!')
        // Reset form
        setFormData({
          title: '',
          timeframe: '',
          pair: '',
          session: '',
          riskReward: '',
          description: ''
        })
        setSelectedBias('')
        setSelectedResult('')
        setConfidence(55)
      }
    } catch (err) {
      console.error('Error:', err)
      alert('Error inesperado')
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
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

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{backgroundColor: '#010314'}}>
        <div className="max-w-md w-full text-center">
          <div className="flex items-center justify-center mb-8">
            <Image
              src="/logo.jpeg"
              alt="TradeTrackr Logo"
              width={80}
              height={80}
              priority
              unoptimized
              className="rounded-xl mr-4 shadow-lg border-2 border-white/20"
              style={{
                filter: 'drop-shadow(0 0 20px rgba(255, 255, 255, 0.3))'
              }}
            />
            <h1 className="text-4xl font-bold text-white">TradeTrackr</h1>
          </div>
          <p className="text-gray-400 mb-8">Registra y analiza tus trades como un profesional</p>
          <div className="space-y-4">
            <Link
              href="/login"
              className="block w-full bg-white text-black font-bold py-4 px-8 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Iniciar Sesión
            </Link>
            <Link
              href="/signup"
              className="block w-full bg-gray-700 text-white font-bold py-4 px-8 rounded-lg hover:bg-gray-600 transition-colors"
            >
              Crear Cuenta
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6" style={{backgroundColor: '#010314'}}>
      {/* Navbar */}
      <nav className="max-w-6xl mx-auto mb-8 flex justify-between items-center">
        <div className="flex items-center">
          <Image
            src="/logo.jpeg"
            alt="TradeTrackr Logo"
            width={50}
            height={50}
            priority
            unoptimized
            className="rounded-lg mr-3"
          />
          <h1 className="text-2xl font-bold text-white">TradeTrackr</h1>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-gray-400">Hola, {user.email}</span>
          <Link
            href="/dashboard"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Dashboard
          </Link>
          <button
            onClick={handleLogout}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Cerrar Sesión
          </button>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto">
        {/* Título principal */}
        <h1 className="text-4xl font-bold text-white text-center mb-12">
          Registrar nuevo trade
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Área de screenshot */}
          <div className="border-2 border-dashed border-gray-600 rounded-xl p-12 text-center bg-black/20 backdrop-blur-sm">
            <div className="text-6xl mb-4">📸</div>
            <h3 className="text-xl font-semibold text-white mb-2">
              Arrastra aquí la captura de pantalla de tu operación
            </h3>
            <p className="text-gray-400">
              o haz click para seleccionar desde tu galería
            </p>
          </div>

          {/* Título del trade */}
          <div>
            <label className="block text-white font-semibold mb-3 text-lg">
              Título del trade
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="Ej: Setup EUR/USD en zona de oferta"
              className="w-full p-4 bg-gray-800/60 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none text-base"
              required
            />
          </div>

          {/* Fila de campos: Temporalidad y Par */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-white font-semibold mb-3 text-lg">
                Temporalidad
              </label>
              <div className="relative">
                <select
                  name="timeframe"
                  value={formData.timeframe}
                  onChange={handleInputChange}
                  className="w-full p-4 bg-gray-800/60 border border-gray-600 rounded-xl text-white focus:border-blue-500 focus:outline-none appearance-none text-base pr-12"
                  required
                >
                  <option value="" className="text-gray-400">Selecciona timeframe</option>
                  <option value="1m">1 minuto</option>
                  <option value="5m">5 minutos</option>
                  <option value="15m">15 minutos</option>
                  <option value="30m">30 minutos</option>
                  <option value="1h">1 hora</option>
                  <option value="4h">4 horas</option>
                  <option value="1d">1 día</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-white font-semibold mb-3 text-lg">
                Par
              </label>
              <div className="relative">
                <select
                  name="pair"
                  value={formData.pair}
                  onChange={handleInputChange}
                  className="w-full p-4 bg-gray-800/60 border border-gray-600 rounded-xl text-white focus:border-blue-500 focus:outline-none appearance-none text-base pr-12"
                  required
                >
                  <option value="" className="text-gray-400">Selecciona par</option>
                  <option value="EURUSD">EUR/USD</option>
                  <option value="GBPUSD">GBP/USD</option>
                  <option value="USDJPY">USD/JPY</option>
                  <option value="AUDUSD">AUD/USD</option>
                  <option value="USDCAD">USD/CAD</option>
                  <option value="USDCHF">USD/CHF</option>
                  <option value="NZDUSD">NZD/USD</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Fila de campos: Sesión y Risk:Reward */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-white font-semibold mb-3 text-lg">
                Sesión
              </label>
              <div className="relative">
                <select
                  name="session"
                  value={formData.session}
                  onChange={handleInputChange}
                  className="w-full p-4 bg-gray-800/60 border border-gray-600 rounded-xl text-white focus:border-blue-500 focus:outline-none appearance-none text-base pr-12"
                >
                  <option value="" className="text-gray-400">Selecciona sesión</option>
                  <option value="asian">Asiática</option>
                  <option value="london">Londres</option>
                  <option value="newyork">Nueva York</option>
                  <option value="overlap">Solapamiento</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-white font-semibold mb-3 text-lg">
                Risk:Reward
              </label>
              <div className="relative">
                <select
                  name="riskReward"
                  value={formData.riskReward}
                  onChange={handleInputChange}
                  className="w-full p-4 bg-gray-800/60 border border-gray-600 rounded-xl text-white focus:border-blue-500 focus:outline-none appearance-none text-base pr-12"
                  required
                >
                  <option value="" className="text-gray-400">1:2</option>
                  <option value="1:1">1:1</option>
                  <option value="1:2">1:2</option>
                  <option value="1:3">1:3</option>
                  <option value="1:4">1:4</option>
                  <option value="1:5">1:5</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Bias del mercado */}
          <div>
            <label className="block text-white font-semibold mb-4 text-lg">
              Bias del mercado
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setSelectedBias('alcista')}
                className={`p-4 rounded-xl font-semibold text-base transition-all ${
                  selectedBias === 'alcista'
                    ? 'bg-green-600 text-white border-2 border-green-500'
                    : 'bg-gray-800/60 text-gray-300 hover:bg-gray-700/60 border border-gray-600'
                }`}
              >
                Alcista
              </button>
              <button
                type="button"
                onClick={() => setSelectedBias('bajista')}
                className={`p-4 rounded-xl font-semibold text-base transition-all ${
                  selectedBias === 'bajista'
                    ? 'bg-red-600 text-white border-2 border-red-500'
                    : 'bg-gray-800/60 text-gray-300 hover:bg-gray-700/60 border border-gray-600'
                }`}
              >
                Bajista
              </button>
            </div>
          </div>

          {/* Resultado */}
          <div>
            <label className="block text-white font-semibold mb-4 text-lg">
              Resultado
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setSelectedResult('win')}
                className={`p-4 rounded-xl font-semibold text-base transition-all ${
                  selectedResult === 'win'
                    ? 'bg-green-600 text-white border-2 border-green-500'
                    : 'bg-gray-800/60 text-gray-300 hover:bg-gray-700/60 border border-gray-600'
                }`}
              >
                Win
              </button>
              <button
                type="button"
                onClick={() => setSelectedResult('loss')}
                className={`p-4 rounded-xl font-semibold text-base transition-all ${
                  selectedResult === 'loss'
                    ? 'bg-red-600 text-white border-2 border-red-500'
                    : 'bg-gray-800/60 text-gray-300 hover:bg-gray-700/60 border border-gray-600'
                }`}
              >
                Loss
              </button>
              <button
                type="button"
                onClick={() => setSelectedResult('be')}
                className={`p-4 rounded-xl font-semibold text-base transition-all ${
                  selectedResult === 'be'
                    ? 'bg-yellow-600 text-white border-2 border-yellow-500'
                    : 'bg-gray-800/60 text-gray-300 hover:bg-gray-700/60 border border-gray-600'
                }`}
              >
                BE
              </button>
            </div>
          </div>

          {/* Descripción del trade */}
          <div>
            <label className="block text-white font-semibold mb-3 text-lg">
              Descripción del trade
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Describe tu análisis, setup y gestión del trade..."
              rows={6}
              className="w-full p-4 bg-gray-800/60 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none resize-none text-base"
            />
          </div>

          {/* Slider de confianza */}
          <div>
            <label className="block text-white font-semibold mb-4 text-lg">
              ¿Cómo te sentiste con el trade?
            </label>
            <div className="text-center mb-6">
              <span className="text-2xl font-bold text-white">{confidence}%</span>
            </div>
            
            <div className="relative mb-6">
              {/* Slider con fondo de gradiente personalizado */}
              <div className="relative">
                {/* Fondo del gradiente */}
                <div className="confidence-slider-background"></div>
                
                {/* Slider transparente encima */}
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={confidence}
                  onChange={(e) => setConfidence(Number(e.target.value))}
                  className="confidence-slider w-full absolute top-0 left-0"
                />
                
                {/* Emoji posicionado sobre el thumb */}
                <div 
                  className="absolute top-1/2 transform -translate-y-1/2 pointer-events-none text-lg z-20"
                  style={{
                    left: `calc(${confidence}% - 20px)`,
                    width: '40px',
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {getConfidenceEmoji(confidence)}
                </div>
              </div>
              
              {/* Labels debajo del slider */}
              <div className="flex justify-between items-center mt-6">
                <div className="flex flex-col items-center">
                  <span className="text-2xl mb-1">😞</span>
                  <span className="text-red-400 font-semibold text-sm">Mal</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-2xl mb-1">🤔</span>
                  <span className="text-yellow-400 font-semibold text-sm">Regular</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-2xl mb-1">😊</span>
                  <span className="text-green-400 font-semibold text-sm">Genial</span>
                </div>
              </div>
            </div>
          </div>

          {/* Botón de guardar */}
          <div className="pt-4">
            <button
              type="submit"
              className="w-full bg-white text-black font-bold py-4 px-8 rounded-xl hover:bg-gray-100 transition-colors text-lg shadow-lg"
            >
              Guardar Trade
            </button>
          </div>
        </form>
      </div>
    </div>
  )
} 