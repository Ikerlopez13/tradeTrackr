'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import TradeAdviceCard, { useTradeAdvice } from '@/components/TradeAdviceCard'

export default function Home() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [confidence, setConfidence] = useState(55)
  const [selectedBias, setSelectedBias] = useState('')
  const [selectedResult, setSelectedResult] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [uploadLoading, setUploadLoading] = useState(false)
  const [stats, setStats] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [showAdvice, setShowAdvice] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    timeframe: '',
    pair: '',
    session: '',
    riskReward: '',
    description: '',
    confluences: '',
    pnl_type: '',
    pnl_value: ''
  })
  
  const router = useRouter()
  const supabase = createClient()
  const { createAdvice } = useTradeAdvice()

  useEffect(() => {
    const getUser = async () => {
      console.log('🔍 DEBUG - Getting user...')
      const { data: { user }, error } = await supabase.auth.getUser()
      
      console.log('🔍 DEBUG - Auth result:')
      console.log('   - user:', user)
      console.log('   - error:', error)
      
      if (error) {
        console.error('❌ Auth error:', error)
      }
      
      setUser(user)
      if (user) {
        console.log('✅ User authenticated:', user.id, user.email)
        await loadUserData(user.id)
      } else {
        console.log('⚠️ No authenticated user')
      }
      setLoading(false)
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('🔍 DEBUG - Auth state change:', event)
        console.log('   - session:', session)
        console.log('   - user:', session?.user)
        
        setUser(session?.user ?? null)
        if (session?.user) {
          console.log('✅ User from session:', session.user.id, session.user.email)
          loadUserData(session.user.id)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase.auth])

  const loadUserData = async (userId: string) => {
    try {
      // Cargar estadísticas
      const { data: statsData } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', userId)
        .single()

      setStats(statsData)

      // Cargar perfil
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      setProfile(profileData)
    } catch (err) {
      console.error('Error loading user data:', err)
    }
  }

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

  // Funciones para manejar drag & drop
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files && files[0]) {
      handleFileSelection(files[0])
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files[0]) {
      handleFileSelection(files[0])
    }
  }

  const handleFileSelection = (file: File) => {
    // Validar que sea una imagen
    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona solo archivos de imagen')
      return
    }

    // Validar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('El archivo es demasiado grande. Máximo 5MB.')
      return
    }

    setSelectedFile(file)

    // Crear preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const removeFile = () => {
    setSelectedFile(null)
    setPreviewUrl(null)
  }

  const uploadFile = async (file: File) => {
    if (!user) return null

    try {
      setUploadLoading(true)
      
      // Crear nombre único para el archivo
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}/${Date.now()}.${fileExt}`

      console.log('Subiendo archivo:', fileName)
      console.log('Usuario ID:', user.id)

      // Subir archivo a Supabase Storage
      const { data, error } = await supabase.storage
        .from('trade-screenshots')
        .upload(fileName, file)

      if (error) {
        console.error('Error uploading file:', error)
        // Solo mostrar error si realmente falló la subida
        if (!data) {
          alert(`Error al subir imagen: ${error.message}`)
          return null
        }
        // Si hay data pero también error, probablemente es un warning, no un error crítico
        console.warn('Warning en subida, pero archivo subido:', data)
      }

      console.log('Archivo subido exitosamente:', data)

      // Obtener URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('trade-screenshots')
        .getPublicUrl(fileName)

      console.log('URL pública:', publicUrl)
      return publicUrl
    } catch (error) {
      console.error('Error:', error)
      alert(`Error inesperado: ${error}`)
      return null
    } finally {
      setUploadLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Verificación de límite de trades (frontend check, pero el servidor también valida)
    if (isTrialExpired) {
      alert('Has alcanzado el límite de 3 trades gratuitos. Actualiza a Premium para continuar.')
      return
    }

    // Validaciones básicas
    if (!formData.title || !formData.pair || !formData.timeframe || !formData.riskReward || !selectedBias || !selectedResult) {
      alert('Por favor completa todos los campos obligatorios')
      return
    }

    if (!user) {
      alert('Error: No hay usuario autenticado. Por favor recarga la página.')
      return
    }

    try {
      let screenshotUrl = null

      // Subir imagen si existe
      if (selectedFile) {
        console.log('Subiendo imagen...')
        screenshotUrl = await uploadFile(selectedFile)
        if (!screenshotUrl) {
          console.log('No se pudo subir la imagen, continuando sin ella...')
        }
      }

      // Calcular P&L basado en el tipo seleccionado
      let pnl_percentage = null
      let pnl_pips = null
      let pnl_money = null

      if (formData.pnl_type && formData.pnl_value) {
        const value = parseFloat(formData.pnl_value)
        if (!isNaN(value)) {
          if (formData.pnl_type === 'percentage') {
            pnl_percentage = value
          } else if (formData.pnl_type === 'pips') {
            pnl_pips = value
          } else if (formData.pnl_type === 'money') {
            pnl_money = value
          }
        }
      }

      console.log('Guardando trade usando API segura...')
      
      // Usar API route segura en lugar de llamada directa a Supabase
      const tradeData = {
        title: formData.title,
        pair: formData.pair,
        timeframe: formData.timeframe,
        session: formData.session,
        bias: selectedBias,
        risk_reward: formData.riskReward,
        result: selectedResult,
        feeling: confidence,
        description: formData.description,
        confluences: formData.confluences,
        pnl_percentage: pnl_percentage,
        pnl_pips: pnl_pips,
        pnl_money: pnl_money,
        screenshot_url: screenshotUrl
      }
      
      const response = await fetch('/api/trades', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tradeData)
      })

      const result = await response.json()

      if (!response.ok) {
        // Manejar errores específicos del servidor
        if (result.premium_required) {
          alert(`🔒 ${result.message}\n\nActualiza a Premium para continuar registrando trades.`)
        } else {
          alert(`Error: ${result.error}`)
        }
        return
      }

      console.log('✅ Trade guardado exitosamente:', result.trade)
      alert('¡Trade guardado exitosamente!')
      
      // Reset form
      setFormData({
        title: '',
        timeframe: '',
        pair: '',
        session: '',
        riskReward: '',
        description: '',
        confluences: '',
        pnl_type: '',
        pnl_value: ''
      })
      setSelectedBias('')
      setSelectedResult('')
      setConfidence(55)
      setSelectedFile(null)
      setPreviewUrl(null)
      
      // Recargar datos del usuario para actualizar el contador
      await loadUserData(user.id)

      // Mostrar consejo
      await showTradeAdvice(tradeData)
      
    } catch (err) {
      console.error('💥 Unexpected error:', err)
      alert('Error de conexión. Por favor verifica tu internet e inténtalo de nuevo.')
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // Función para generar consejos de IA basados en el trade
  const generateTradeAdvice = (tradeData: any) => {
    const advices = [
      // Consejos basados en resultado
      ...(tradeData.result === 'Win' ? [
        `¡Excelente trade ganador en ${tradeData.pair}! Tu estrategia en ${tradeData.timeframe} está funcionando bien. Mantén la disciplina y sigue aplicando el mismo análisis.`,
        `Gran trabajo con ese trade alcista/bajista en ${tradeData.pair}. Tu ratio riesgo/beneficio de ${tradeData.risk_reward} es sólido. Considera documentar qué funcionó bien para replicarlo.`,
        `Trade ganador bien ejecutado. Tu nivel de confianza del ${tradeData.feeling}% se alineó con el resultado. Sigue confiando en tu análisis cuando tengas confluencias claras.`
      ] : tradeData.result === 'Loss' ? [
        `No te desanimes por esta pérdida en ${tradeData.pair}. Los trades perdedores son parte del juego. Revisa tu análisis y ajusta si es necesario, pero mantén tu plan de trading.`,
        `Esta pérdida en ${tradeData.timeframe} es una oportunidad de aprendizaje. Con un R:R de ${tradeData.risk_reward}, estás gestionando bien el riesgo. Mantén la consistencia.`,
        `Pérdida controlada en ${tradeData.pair}. Tu gestión de riesgo está funcionando. Analiza qué señales podrían haber sido diferentes y ajusta para el próximo trade.`
      ] : [
        `Trade en breakeven en ${tradeData.pair}. Aunque no ganaste, tampoco perdiste capital. Esto muestra buena gestión de riesgo. Evalúa si pudiste haber optimizado la salida.`,
        `Breakeven en ${tradeData.timeframe} - resultado neutral pero gestión inteligente. Considera si tus niveles de take profit fueron demasiado ambiciosos para las condiciones del mercado.`
      ]),
      
      // Consejos basados en confianza
      ...(tradeData.feeling <= 33 ? [
        `Noté que tu nivel de confianza fue bajo (${tradeData.feeling}%). Si no te sientes seguro de un setup, considera reducir el tamaño de posición o esperar mejores confluencias.`,
        `Confianza del ${tradeData.feeling}% sugiere incertidumbre. En el futuro, busca setups con más confluencias técnicas antes de entrar al mercado.`
      ] : tradeData.feeling >= 70 ? [
        `Excelente nivel de confianza del ${tradeData.feeling}%! Cuando tienes alta convicción en un trade, es cuando generalmente obtienes los mejores resultados. Sigue confiando en tu análisis.`,
        `Tu confianza del ${tradeData.feeling}% muestra que identificaste un setup sólido. Estos son los trades que debes buscar: alta probabilidad con múltiples confluencias.`
      ] : []),

      // Consejos basados en sesión
      ...(tradeData.session === 'London' ? [
        `Trade en sesión de Londres: generalmente hay buena volatilidad. Asegúrate de estar atento a los datos económicos europeos que pueden afectar tu ${tradeData.pair}.`,
      ] : tradeData.session === 'New York' ? [
        `Sesión de Nueva York es perfecta para ${tradeData.pair}. La liquidez alta te permite mejores entradas y salidas. Mantén ojo en los datos económicos de EE.UU.`,
      ] : tradeData.session === 'Asian' ? [
        `Trading en sesión asiática requiere paciencia. Los movimientos suelen ser más lentos pero más predecibles. Tu enfoque en ${tradeData.timeframe} es apropiado.`,
      ] : []),

      // Consejos generales de mejora
      `Para tu próximo trade en ${tradeData.pair}, considera documentar más confluencias técnicas. Esto te ayudará a tomar decisiones más informadas.`,
      `Tu ratio R:R de ${tradeData.risk_reward} es profesional. Mantén siempre esta disciplina de gestión de riesgo en todos tus trades.`,
      `Continúa siendo consistente con tu análisis en ${tradeData.timeframe}. La consistencia en el enfoque es clave para el éxito a largo plazo.`,
      `Considera revisar tus trades semanalmente para identificar patrones. Esto te ayudará a refinar tu estrategia y mejorar tu tasa de éxito.`
    ]

    // Seleccionar un consejo aleatorio
    return advices[Math.floor(Math.random() * advices.length)]
  }

  // Función para crear y mostrar consejo después de guardar trade
  const showTradeAdvice = async (tradeData: any) => {
    try {
      const adviceText = generateTradeAdvice(tradeData)
      await createAdvice(user.id, adviceText)
      setShowAdvice(true)
    } catch (error) {
      console.error('Error creating advice:', error)
    }
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

  // Verificar límite de trades
  const totalTrades = stats?.total_trades || 0
  const isPremium = profile?.is_premium || false
  const isTrialExpired = !isPremium && totalTrades >= 3

  return (
    <div className="min-h-screen" style={{backgroundColor: '#010314'}}>
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
            className="text-white font-medium hover:text-gray-300 transition-colors"
          >
            Nuevo Trade
          </Link>
          <Link
            href="/trades"
            className="text-gray-400 font-medium hover:text-white transition-colors"
          >
            Mis Trades
          </Link>
          {!isPremium ? (
            <Link
              href="/pricing"
              className="text-gray-400 font-medium hover:text-white transition-colors"
            >
              Pricing
            </Link>
          ) : (
            <Link
              href="/subscription"
              className="text-gray-400 font-medium hover:text-white transition-colors"
            >
              Suscripción
            </Link>
          )}
          <Link
            href="/profile"
            className="text-gray-400 font-medium hover:text-white transition-colors"
          >
            Perfil
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
        <div className="max-w-2xl mx-auto px-6 py-6">
          {/* Alerta de límite alcanzado */}
          {isTrialExpired && (
            <div className="text-center mb-8 bg-red-900/20 border border-red-500/50 rounded-lg p-6">
              <div className="text-4xl mb-4">🚫</div>
              <h2 className="text-red-400 font-bold text-xl mb-2">Límite Alcanzado</h2>
              <p className="text-gray-300 mb-4">
                Has usado todos tus 3 trades gratuitos. Actualiza a Premium para continuar registrando trades.
              </p>
              <Link
                href="/profile"
                className="inline-block bg-yellow-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-yellow-700 transition-colors"
              >
                Ver Premium
              </Link>
            </div>
          )}

          {/* Título principal */}
          <h1 className="text-xl md:text-2xl font-bold text-white text-center mb-6">
            {isTrialExpired ? 'Formulario bloqueado' : 'Registrar nuevo trade'}
          </h1>

          {/* Formulario - Deshabilitado si se alcanzó el límite */}
          <form onSubmit={handleSubmit} className={`space-y-5 ${isTrialExpired ? 'opacity-50 pointer-events-none' : ''}`}>
            {/* Área de screenshot mejorada */}
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center bg-black/20 backdrop-blur-sm transition-all duration-300 cursor-pointer relative ${
                isDragging 
                  ? 'border-blue-500 bg-blue-500/10 scale-105' 
                  : selectedFile 
                    ? 'border-green-500 bg-green-500/10' 
                    : 'border-gray-600 hover:border-gray-500'
              }`}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => !isTrialExpired && document.getElementById('file-input')?.click()}
            >
              <input
                id="file-input"
                type="file"
                accept="image/*"
                onChange={handleFileInput}
                className="hidden"
                disabled={isTrialExpired}
              />
              
              {previewUrl ? (
                <div className="relative">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="max-w-full max-h-48 mx-auto rounded-lg shadow-lg"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      removeFile()
                    }}
                    className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-700 transition-colors"
                    disabled={isTrialExpired}
                  >
                    ×
                  </button>
                  <div className="mt-3 text-sm text-gray-300">
                    {selectedFile?.name}
                  </div>
                </div>
              ) : (
                <div>
                  <div className={`text-4xl mb-3 transition-transform duration-300 ${isDragging ? 'scale-110' : ''}`}>
                    {isDragging ? '📥' : '📸'}
                  </div>
                  <h3 className="text-base font-medium text-white mb-1">
                    {isDragging 
                      ? '¡Suelta la imagen aquí!' 
                      : 'Arrastra aquí la captura de pantalla de tu operación'
                    }
                  </h3>
                  <p className="text-gray-400 text-sm">
                    o haz click para seleccionar desde tu galería
                  </p>
                  <p className="text-gray-500 text-xs mt-2">
                    Formatos: JPG, PNG, GIF • Máximo 5MB
                  </p>
                </div>
              )}
              
              {uploadLoading && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                  <div className="text-white text-sm">Subiendo imagen...</div>
                </div>
              )}
            </div>

            {/* Título del trade */}
            <div>
              <label className="block text-white font-medium mb-2 text-base">
                Título del trade
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="Ej: Setup EUR/USD en zona de oferta"
                className="w-full p-3 bg-gray-800/60 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none text-sm"
                required
                disabled={isTrialExpired}
              />
            </div>

            {/* Fila de campos: Temporalidad y Par */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-white font-medium mb-2 text-base">
                  Temporalidad
                </label>
                <div className="relative">
                  <select
                    name="timeframe"
                    value={formData.timeframe}
                    onChange={handleInputChange}
                    className="w-full p-3 bg-gray-800/60 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none appearance-none text-sm pr-8"
                    required
                    disabled={isTrialExpired}
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
                  <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-white font-medium mb-2 text-base">
                  Par
                </label>
                <div className="relative">
                  <select
                    name="pair"
                    value={formData.pair}
                    onChange={handleInputChange}
                    className="w-full p-3 bg-gray-800/60 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none appearance-none text-sm pr-8"
                    required
                    disabled={isTrialExpired}
                  >
                    <option value="" className="text-gray-400">Selecciona par</option>
                    <optgroup label="Forex Mayores">
                      <option value="EURUSD">EUR/USD</option>
                      <option value="GBPUSD">GBP/USD</option>
                      <option value="USDJPY">USD/JPY</option>
                      <option value="AUDUSD">AUD/USD</option>
                      <option value="USDCAD">USD/CAD</option>
                      <option value="USDCHF">USD/CHF</option>
                      <option value="NZDUSD">NZD/USD</option>
                    </optgroup>
                    <optgroup label="Forex Menores">
                      <option value="EURGBP">EUR/GBP</option>
                      <option value="EURJPY">EUR/JPY</option>
                      <option value="GBPJPY">GBP/JPY</option>
                      <option value="AUDJPY">AUD/JPY</option>
                      <option value="CADJPY">CAD/JPY</option>
                      <option value="CHFJPY">CHF/JPY</option>
                    </optgroup>
                    <optgroup label="Metales Preciosos">
                      <option value="XAUUSD">XAU/USD (Oro)</option>
                      <option value="XAGUSD">XAG/USD (Plata)</option>
                      <option value="XPTUSD">XPT/USD (Platino)</option>
                      <option value="XPDUSD">XPD/USD (Paladio)</option>
                    </optgroup>
                    <optgroup label="Índices">
                      <option value="US30">US30 (Dow Jones)</option>
                      <option value="NAS100">NAS100 (Nasdaq)</option>
                      <option value="SPX500">SPX500 (S&P 500)</option>
                      <option value="GER40">GER40 (DAX)</option>
                      <option value="UK100">UK100 (FTSE)</option>
                      <option value="JPN225">JPN225 (Nikkei)</option>
                    </optgroup>
                    <optgroup label="Criptomonedas">
                      <option value="BTCUSD">BTC/USD</option>
                      <option value="ETHUSD">ETH/USD</option>
                      <option value="BNBUSD">BNB/USD</option>
                      <option value="ADAUSD">ADA/USD</option>
                    </optgroup>
                    <optgroup label="Commodities">
                      <option value="USOIL">Petróleo US</option>
                      <option value="UKOIL">Petróleo UK</option>
                      <option value="NATGAS">Gas Natural</option>
                    </optgroup>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Fila de campos: Sesión y Risk:Reward */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-white font-medium mb-2 text-base">
                  Sesión
                </label>
                <div className="relative">
                  <select
                    name="session"
                    value={formData.session}
                    onChange={handleInputChange}
                    className="w-full p-3 bg-gray-800/60 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none appearance-none text-sm pr-8"
                    disabled={isTrialExpired}
                  >
                    <option value="" className="text-gray-400">Selecciona sesión</option>
                    <option value="asian">Asiática</option>
                    <option value="london">Londres</option>
                    <option value="newyork">Nueva York</option>
                    <option value="overlap">Solapamiento</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-white font-medium mb-2 text-base">
                  Risk:Reward
                </label>
                <div className="relative">
                  <select
                    name="riskReward"
                    value={formData.riskReward}
                    onChange={handleInputChange}
                    className="w-full p-3 bg-gray-800/60 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none appearance-none text-sm pr-8"
                    required
                    disabled={isTrialExpired}
                  >
                    <option value="" className="text-gray-400">Selecciona ratio</option>
                    <option value="1:1">1:1</option>
                    <option value="1:2">1:2</option>
                    <option value="1:3">1:3</option>
                    <option value="1:4">1:4</option>
                    <option value="1:5">1:5</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Bias del mercado */}
            <div>
              <label className="block text-white font-medium mb-3 text-base">
                Bias del mercado
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => !isTrialExpired && setSelectedBias('alcista')}
                  className={`p-3 rounded-lg font-medium text-sm transition-all ${
                    selectedBias === 'alcista'
                      ? 'bg-green-600 text-white border border-green-500'
                      : 'bg-gray-800/60 text-gray-300 hover:bg-gray-700/60 border border-gray-600'
                  }`}
                  disabled={isTrialExpired}
                >
                  Alcista
                </button>
                <button
                  type="button"
                  onClick={() => !isTrialExpired && setSelectedBias('bajista')}
                  className={`p-3 rounded-lg font-medium text-sm transition-all ${
                    selectedBias === 'bajista'
                      ? 'bg-red-600 text-white border border-red-500'
                      : 'bg-gray-800/60 text-gray-300 hover:bg-gray-700/60 border border-gray-600'
                  }`}
                  disabled={isTrialExpired}
                >
                  Bajista
                </button>
              </div>
            </div>

            {/* Resultado */}
            <div>
              <label className="block text-white font-medium mb-3 text-base">
                Resultado
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => !isTrialExpired && setSelectedResult('win')}
                  className={`p-3 rounded-lg font-medium text-sm transition-all ${
                    selectedResult === 'win'
                      ? 'bg-green-600 text-white border border-green-500'
                      : 'bg-gray-800/60 text-gray-300 hover:bg-gray-700/60 border border-gray-600'
                  }`}
                  disabled={isTrialExpired}
                >
                  Win
                </button>
                <button
                  type="button"
                  onClick={() => !isTrialExpired && setSelectedResult('loss')}
                  className={`p-3 rounded-lg font-medium text-sm transition-all ${
                    selectedResult === 'loss'
                      ? 'bg-red-600 text-white border border-red-500'
                      : 'bg-gray-800/60 text-gray-300 hover:bg-gray-700/60 border border-gray-600'
                  }`}
                  disabled={isTrialExpired}
                >
                  Loss
                </button>
                <button
                  type="button"
                  onClick={() => !isTrialExpired && setSelectedResult('be')}
                  className={`p-3 rounded-lg font-medium text-sm transition-all ${
                    selectedResult === 'be'
                      ? 'bg-yellow-600 text-white border border-yellow-500'
                      : 'bg-gray-800/60 text-gray-300 hover:bg-gray-700/60 border border-gray-600'
                  }`}
                  disabled={isTrialExpired}
                >
                  BE
                </button>
              </div>
            </div>

            {/* Descripción del trade */}
            <div>
              <label className="block text-white font-medium mb-2 text-base">
                Descripción del trade
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Describe tu análisis, setup y gestión del trade..."
                rows={4}
                className="w-full p-3 bg-gray-800/60 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none resize-none text-sm"
                disabled={isTrialExpired}
              />
            </div>

            {/* Confluencias */}
            <div>
              <label className="block text-white font-medium mb-2 text-base">
                Confluencias
              </label>
              <textarea
                name="confluences"
                value={formData.confluences}
                onChange={handleInputChange}
                placeholder="¿Qué te hizo tomar este trade? Ej: Soporte/Resistencia, Fibonacci, Patrones, etc..."
                rows={3}
                className="w-full p-3 bg-gray-800/60 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none resize-none text-sm"
                disabled={isTrialExpired}
              />
            </div>

            {/* Resultado financiero - Opcional y flexible */}
            <div>
              <label className="block text-white font-medium mb-3 text-base">
                Resultado financiero (opcional)
              </label>
              
              {/* Selector de tipo de P&L */}
              <div className="mb-3">
                <div className="relative">
                  <select
                    name="pnl_type"
                    value={formData.pnl_type}
                    onChange={handleInputChange}
                    className="w-full p-3 bg-gray-800/60 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none appearance-none text-sm pr-8"
                    disabled={isTrialExpired}
                  >
                    <option value="" className="text-gray-400">Selecciona tipo de resultado</option>
                    <option value="percentage">Porcentaje (%)</option>
                    <option value="pips">Pips</option>
                    <option value="money">Dinero ($)</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Campo de valor solo si se seleccionó un tipo */}
              {formData.pnl_type && (
                <div>
                  <input
                    type="number"
                    name="pnl_value"
                    value={formData.pnl_value}
                    onChange={handleInputChange}
                    placeholder={
                      formData.pnl_type === 'percentage' ? 'Ej: +2,5 o -1,8' :
                      formData.pnl_type === 'pips' ? 'Ej: +50 o -25' :
                      'Ej: +150 o -75'
                    }
                    step={formData.pnl_type === 'percentage' ? '0.01' : formData.pnl_type === 'pips' ? '0.1' : '0.01'}
                    className="w-full p-3 bg-gray-800/60 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none text-sm"
                    disabled={isTrialExpired}
                  />
                  <div className="text-gray-400 text-xs mt-1">
                    {formData.pnl_type === 'percentage' && 'Ingresa el porcentaje de ganancia/pérdida (ej: 2,5 para +2,5%)'}
                    {formData.pnl_type === 'pips' && 'Ingresa los pips ganados/perdidos (ej: 50 para +50 pips)'}
                    {formData.pnl_type === 'money' && 'Ingresa la cantidad en dinero ganada/perdida (ej: 150 para +$150)'}
                  </div>
                </div>
              )}
            </div>

            {/* Selector de sentimiento - Versión con botones fijos */}
            <div>
              <label className="block text-white font-medium mb-3 text-base">
                ¿Cómo te sentiste con el trade?
              </label>
              
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => !isTrialExpired && setConfidence(25)}
                  className={`p-4 rounded-lg font-medium text-sm transition-all flex flex-col items-center space-y-2 ${
                    confidence <= 33
                      ? 'bg-red-600/20 text-red-400 border border-red-500/50'
                      : 'bg-gray-800/60 text-gray-300 hover:bg-gray-700/60 border border-gray-600'
                  }`}
                  disabled={isTrialExpired}
                >
                  <span className="text-2xl">😞</span>
                  <span>Mal</span>
                </button>
                
                <button
                  type="button"
                  onClick={() => !isTrialExpired && setConfidence(55)}
                  className={`p-4 rounded-lg font-medium text-sm transition-all flex flex-col items-center space-y-2 ${
                    confidence > 33 && confidence <= 66
                      ? 'bg-yellow-600/20 text-yellow-400 border border-yellow-500/50'
                      : 'bg-gray-800/60 text-gray-300 hover:bg-gray-700/60 border border-gray-600'
                  }`}
                  disabled={isTrialExpired}
                >
                  <span className="text-2xl">🤔</span>
                  <span>Regular</span>
                </button>
                
                <button
                  type="button"
                  onClick={() => !isTrialExpired && setConfidence(85)}
                  className={`p-4 rounded-lg font-medium text-sm transition-all flex flex-col items-center space-y-2 ${
                    confidence > 66
                      ? 'bg-green-600/20 text-green-400 border border-green-500/50'
                      : 'bg-gray-800/60 text-gray-300 hover:bg-gray-700/60 border border-gray-600'
                  }`}
                  disabled={isTrialExpired}
                >
                  <span className="text-2xl">😊</span>
                  <span>Genial</span>
                </button>
              </div>
            </div>

            {/* Botón de guardar */}
            <div className="pt-2">
              <button
                type="submit"
                className={`w-full font-semibold py-3 px-6 rounded-lg transition-colors text-base shadow-lg ${
                  isTrialExpired 
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                    : 'bg-white text-black hover:bg-gray-100'
                }`}
                disabled={isTrialExpired}
              >
                {isTrialExpired ? 'Límite Alcanzado - Upgrade a Premium' : 'Guardar Trade'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Bottom Navigation Menu - Solo móvil */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 backdrop-blur-sm border-t border-gray-800 z-50" style={{backgroundColor: '#010314'}}>
        <div className="flex justify-around items-center py-2">
          {/* Nuevo Trade - Página actual */}
          <Link
            href="/"
            className="flex flex-col items-center py-1 px-2 text-white"
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

          {/* Pricing - Solo para usuarios gratuitos */}
          {!isPremium ? (
            <Link
              href="/pricing"
              className="flex flex-col items-center py-1 px-2 text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
              <span className="text-xs font-medium">Pricing</span>
            </Link>
          ) : (
            <Link
              href="/subscription"
              className="flex flex-col items-center py-1 px-2 text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
              <span className="text-xs font-medium">Suscripción</span>
            </Link>
          )}

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
        </div>
      </nav>

      {/* Modal de Consejo de IA */}
      {showAdvice && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900/95 rounded-xl p-6 max-w-md w-full mx-4 border border-blue-500/20">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">AI</span>
                </div>
                <div>
                  <h3 className="text-white font-semibold">TradeTrackrAI</h3>
                  <p className="text-blue-300 text-xs">Trade guardado exitosamente</p>
                </div>
              </div>
              <button
                onClick={() => setShowAdvice(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Contenido del consejo */}
            <div className="mb-6">
              <TradeAdviceCard className="!p-0 !bg-transparent !border-0" />
            </div>

            {/* Botones */}
            <div className="flex space-x-3">
              <button
                onClick={() => setShowAdvice(false)}
                className="flex-1 bg-gray-700 text-white py-3 px-4 rounded-lg hover:bg-gray-600 transition-colors font-medium"
              >
                Entendido
              </button>
              <Link
                href="/profile"
                onClick={() => setShowAdvice(false)}
                className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-500 transition-colors font-medium text-center"
              >
                Ver Perfil
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}