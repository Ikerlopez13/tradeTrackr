'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import TradeAdviceCard, { useTradeAdvice } from '@/components/TradeAdviceCard'
import Layout from '@/components/Layout'
import LoadingSpinner from '@/components/LoadingSpinner'
import { Camera, Trophy } from 'lucide-react'
import LotSizeCalculator from '@/components/LotSizeCalculator'

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
    pair: '',
    timeframe: '',
    session: '',
    riskReward: '',
    confluences: '',
    description: '',
    pnl_type: '',
    pnl_value: '',
    entry_price: '',
    stop_loss: '',
    take_profit: '',
    exit_price: '',
    lot_size: '',
    commission: '',
    swap: '',
    notes: '',
    expert_advisor: '',
    isPublic: false
  })
  
  const router = useRouter()
  const supabase = createClient()
  const { createAdvice } = useTradeAdvice()

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        
        if (error) {
          console.error('Auth error:', error)
        }
        
        setUser(user)
        if (user) {
          await loadUserData(user.id)
        }
        setLoading(false)
      } catch (err) {
        console.error('Error getting user:', err)
        setLoading(false)
      }
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null)
        if (session?.user) {
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
          // 🔧 BUG FIX: Si el resultado es "loss" y el valor es positivo, convertir a negativo
          let adjustedValue = value
          if (selectedResult === 'loss' && value > 0) {
            adjustedValue = -value
          }
          
          // 🚀 NUEVA FUNCIONALIDAD: Conversión automática entre tipos de P&L
          if (formData.pnl_type === 'percentage') {
            pnl_percentage = adjustedValue
            
            // Calcular automáticamente pips y dinero basado en el porcentaje
            const accountBalance = profile?.account_balance || 1000
            
            // Calcular dinero: balance * (porcentaje / 100)
            pnl_money = accountBalance * (adjustedValue / 100)
            
            // Calcular pips basado en el par de divisas
            // Diferentes pares tienen diferentes valores por pip
            const pipValue = getPipValue(formData.pair, accountBalance)
            if (pipValue > 0) {
              pnl_pips = Math.round((pnl_money / pipValue) * 10) / 10 // Redondear a 1 decimal
            }
            
          } else if (formData.pnl_type === 'pips') {
            pnl_pips = adjustedValue
            
            // Calcular dinero y porcentaje basado en pips
            const accountBalance = profile?.account_balance || 1000
            const pipValue = getPipValue(formData.pair, accountBalance)
            
            if (pipValue > 0) {
              pnl_money = adjustedValue * pipValue
              pnl_percentage = (pnl_money / accountBalance) * 100
            }
            
          } else if (formData.pnl_type === 'money') {
            pnl_money = adjustedValue
            
            // Calcular porcentaje y pips basado en dinero
            const accountBalance = profile?.account_balance || 1000
            pnl_percentage = (adjustedValue / accountBalance) * 100
            
            const pipValue = getPipValue(formData.pair, accountBalance)
            if (pipValue > 0) {
              pnl_pips = Math.round((adjustedValue / pipValue) * 10) / 10 // Redondear a 1 decimal
            }
          }
        }
      }

      console.log('Guardando trade usando API segura...')
      
      // Crear el objeto trade
      const tradeData = {
        title: formData.title,
        pair: formData.pair,
        timeframe: formData.timeframe,
        session: formData.session,
        bias: selectedBias,
        risk_reward: formData.riskReward,
        result: selectedResult?.toLowerCase(),
        feeling: confidence,
        description: formData.description,
        confluences: formData.confluences,
        pnl_percentage,
        pnl_pips,
        pnl_money,
        screenshot_url: screenshotUrl,
        entry_price: formData.entry_price ? parseFloat(formData.entry_price) : null,
        stop_loss: formData.stop_loss ? parseFloat(formData.stop_loss) : null,
        take_profit: formData.take_profit ? parseFloat(formData.take_profit) : null,
        exit_price: formData.exit_price ? parseFloat(formData.exit_price) : null,
        lot_size: formData.lot_size ? parseFloat(formData.lot_size) : null,
        commission: formData.commission ? parseFloat(formData.commission) : null,
        swap: formData.swap ? parseFloat(formData.swap) : null,
        notes: formData.notes || null,
        expert_advisor: formData.expert_advisor || null,
        is_public: formData.isPublic
      }
      
      const response = await fetch('/api/trades', {
        method: 'POST',
        credentials: 'include',
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
        pair: '',
        timeframe: '',
        session: '',
        riskReward: '',
        confluences: '',
        description: '',
        pnl_type: '',
        pnl_value: '',
        entry_price: '',
        stop_loss: '',
        take_profit: '',
        exit_price: '',
        lot_size: '',
        commission: '',
        swap: '',
        notes: '',
        expert_advisor: '',
        isPublic: false
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

  // 🚀 NUEVA FUNCIÓN: Calcular valor por pip según el par de divisas
  const getPipValue = (pair: string, accountBalance: number): number => {
    if (!pair) return 0
    
    // Tamaño de lote estándar (ajustable según el balance)
    // Para cuentas pequeñas, usamos mini lotes o micro lotes
    const lotSize = accountBalance >= 10000 ? 100000 : // Lote estándar
                   accountBalance >= 1000 ? 10000 : // Mini lote
                   1000 // Micro lote
    
    // Valores aproximados por pip para diferentes tipos de pares
    // Estos son valores estimados - en trading real dependen del broker y condiciones de mercado
    
    // Pares mayores (USD como divisa cotizada)
    const majorPairs = ['EURUSD', 'GBPUSD', 'AUDUSD', 'NZDUSD', 'USDCAD', 'USDCHF', 'USDJPY']
    
    // Pares con JPY (valor diferente por la cotización)
    const jpyPairs = ['USDJPY', 'EURJPY', 'GBPJPY', 'AUDJPY', 'CADJPY', 'CHFJPY']
    
    // Metales preciosos
    const metals = ['XAUUSD', 'XAGUSD', 'XPTUSD', 'XPDUSD']
    
    // Índices (valores más altos)
    const indices = ['US30', 'NAS100', 'SPX500', 'GER40', 'UK100', 'JPN225']
    
    if (jpyPairs.includes(pair)) {
      // Para pares JPY, 1 pip = 0.01, valor aproximado
      return (lotSize * 0.01) / 100 // Ajustado para mini/micro lotes
    } else if (majorPairs.includes(pair)) {
      // Para pares mayores, 1 pip = 0.0001
      return (lotSize * 0.0001) / 10 // Ajustado para mini/micro lotes
    } else if (metals.includes(pair)) {
      // Para metales, valores más altos
      if (pair === 'XAUUSD') return lotSize * 0.01 / 100 // Oro
      if (pair === 'XAGUSD') return lotSize * 0.001 / 100 // Plata
      return lotSize * 0.001 / 100
    } else if (indices.includes(pair)) {
      // Para índices, valores más altos
      return lotSize * 0.1 / 100
    } else {
      // Valor por defecto para otros pares
      return (lotSize * 0.0001) / 10
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

  // Detectar si es móvil
  const isMobile = typeof window !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: '#010314'}}>
        <LoadingSpinner size={100} />
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
    <Layout>
      {/* Contenido principal */}
      <div className="p-6">
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
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
            {isTrialExpired ? 'Formulario bloqueado' : 'Registrar nuevo trade'}
          </h1>
          <p className="text-gray-400">
            Documenta tu análisis y resultados de trading
          </p>
        </div>

          {/* Formulario - Deshabilitado si se alcanzó el límite */}
        <div className="max-w-2xl mx-auto">
          <form onSubmit={handleSubmit} className={`space-y-5 ${isTrialExpired ? 'opacity-50 pointer-events-none' : ''}`}>
            {/* Área de screenshot mejorada */}
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center bg-black/20 backdrop-blur-sm transition-all duration-300 cursor-pointer relative ${
                isDragging 
                  ? 'border-blue-500 bg-blue-500/10' 
                    : 'border-gray-600 hover:border-gray-500'
              }`}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => document.getElementById('fileInput')?.click()}
            >
              <input
                type="file"
                id="fileInput"
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
                    className="max-h-48 mx-auto rounded-lg shadow-lg"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      removeFile()
                    }}
                    className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 hover:bg-red-700 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ) : (
                <div className="py-8">
                  <Camera className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-400 text-lg mb-2">
                    {isDragging ? 'Suelta la imagen aquí' : 'Sube tu screenshot'}
                  </p>
                  <p className="text-gray-500 text-sm">
                    Arrastra y suelta o haz clic para seleccionar
                  </p>
                  <p className="text-gray-600 text-xs mt-2">
                    JPG, PNG, GIF hasta 5MB
                  </p>
                </div>
              )}
            </div>

            {/* Información básica del trade */}
            <div className="bg-gray-800/30 rounded-lg p-4 space-y-4">
              <h3 className="text-white font-medium flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Información Básica
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 text-sm font-medium mb-2">
                    Título del trade
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    className="w-full p-3 bg-gray-800/60 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                    placeholder="Ej: EURUSD Long Setup"
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-400 text-sm font-medium mb-2">
                    Par de divisas
                  </label>
                  <select
                    name="pair"
                    value={formData.pair}
                    onChange={handleInputChange}
                    className="w-full p-3 bg-gray-800/60 border border-gray-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                    required
                  >
                    <option value="">Selecciona un par</option>
                    <option value="EURUSD">EUR/USD</option>
                    <option value="GBPUSD">GBP/USD</option>
                    <option value="USDJPY">USD/JPY</option>
                    <option value="USDCHF">USD/CHF</option>
                    <option value="USDCAD">USD/CAD</option>
                    <option value="AUDUSD">AUD/USD</option>
                    <option value="NZDUSD">NZD/USD</option>
                    <option value="EURJPY">EUR/JPY</option>
                    <option value="GBPJPY">GBP/JPY</option>
                    <option value="EURGBP">EUR/GBP</option>
                    <option value="AUDCAD">AUD/CAD</option>
                    <option value="EURAUD">EUR/AUD</option>
                    <option value="EURCHF">EUR/CHF</option>
                    <option value="AUDJPY">AUD/JPY</option>
                    <option value="GBPAUD">GBP/AUD</option>
                    <option value="GBPCAD">GBP/CAD</option>
                    <option value="GBPCHF">GBP/CHF</option>
                    <option value="CADCHF">CAD/CHF</option>
                    <option value="CADJPY">CAD/JPY</option>
                    <option value="AUDCHF">AUD/CHF</option>
                    <option value="NZDCAD">NZD/CAD</option>
                    <option value="NZDJPY">NZD/JPY</option>
                    <option value="NZDCHF">NZD/CHF</option>
                    <option value="AUDNZD">AUD/NZD</option>
                    <option value="CHFJPY">CHF/JPY</option>
                    <option value="EURNZD">EUR/NZD</option>
                    <option value="EURCAD">EUR/CAD</option>
                    <option value="GBPNZD">GBP/NZD</option>
                    <option value="XAUUSD">XAU/USD (Gold)</option>
                    <option value="XAGUSD">XAG/USD (Silver)</option>
                    <option value="BTCUSD">BTC/USD</option>
                    <option value="ETHUSD">ETH/USD</option>
                    <option value="US30">US30</option>
                    <option value="US100">US100</option>
                    <option value="US500">US500</option>
                    <option value="GER30">GER30</option>
                    <option value="UK100">UK100</option>
                    <option value="JPN225">JPN225</option>
                    <option value="AUS200">AUS200</option>
                    <option value="USOIL">US Oil</option>
                    <option value="UKOIL">UK Oil</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-400 text-sm font-medium mb-2">
                    Timeframe
                  </label>
                  <select
                    name="timeframe"
                    value={formData.timeframe}
                    onChange={handleInputChange}
                    className="w-full p-3 bg-gray-800/60 border border-gray-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                    required
                  >
                    <option value="">Selecciona timeframe</option>
                    <option value="1m">1 minuto</option>
                    <option value="5m">5 minutos</option>
                    <option value="15m">15 minutos</option>
                    <option value="30m">30 minutos</option>
                    <option value="1h">1 hora</option>
                    <option value="4h">4 horas</option>
                    <option value="1d">1 día</option>
                    <option value="1w">1 semana</option>
                    <option value="1M">1 mes</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-400 text-sm font-medium mb-2">
                    Sesión de trading
                  </label>
                  <select
                    name="session"
                    value={formData.session}
                    onChange={handleInputChange}
                    className="w-full p-3 bg-gray-800/60 border border-gray-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                    required
                  >
                    <option value="">Selecciona sesión</option>
                    <option value="Asian">Asiática</option>
                    <option value="London">Londres</option>
                    <option value="New York">Nueva York</option>
                    <option value="Sydney">Sydney</option>
                    <option value="Overlap">Solapamiento</option>
                  </select>
                </div>
              </div>

              {/* Análisis */}
              <div>
                <label className="block text-gray-400 text-sm font-medium mb-2">
                  Bias direccional
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['Bullish', 'Bearish', 'Neutral'].map((bias) => (
                    <button
                      key={bias}
                      type="button"
                      onClick={() => setSelectedBias(bias)}
                      className={`p-3 rounded-lg border transition-colors ${
                        selectedBias === bias
                          ? bias === 'Bullish' 
                            ? 'bg-green-600 border-green-500 text-white' 
                            : bias === 'Bearish'
                            ? 'bg-red-600 border-red-500 text-white'
                            : 'bg-yellow-600 border-yellow-500 text-white'
                          : 'bg-gray-800/60 border-gray-700 text-gray-400 hover:border-gray-600'
                      }`}
                    >
                      {bias}
                    </button>
                  ))}
                </div>
              </div>

              {/* Nivel de confianza */}
              <div>
                <label className="block text-gray-400 text-sm font-medium mb-2">
                  Nivel de confianza: {confidence}% {getConfidenceEmoji(confidence)}
                </label>
                <div className="flex items-center space-x-4">
                  <span className="text-gray-500 text-sm">Mal</span>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={confidence}
                    onChange={(e) => setConfidence(Number(e.target.value))}
                    className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <span className="text-gray-500 text-sm">Genial</span>
                </div>
                <div className="mt-2 text-center">
                  <span className={`text-sm font-medium ${
                    confidence <= 33 ? 'text-red-400' : 
                    confidence <= 66 ? 'text-yellow-400' : 'text-green-400'
                  }`}>
                    {getConfidenceText(confidence)}
                  </span>
                </div>
              </div>
            </div>

            {/* Precios del trade */}
            <div className="bg-gray-800/30 rounded-lg p-4 space-y-4">
              <h3 className="text-white font-medium flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Precios del Trade
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 text-sm font-medium mb-2">
                    Precio de Entrada
                  </label>
                  <input
                    type="number"
                    step="0.00001"
                    name="entry_price"
                    value={formData.entry_price}
                    onChange={handleInputChange}
                    className="w-full p-3 bg-gray-800/60 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                    placeholder="Ej: 1.09450"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 text-sm font-medium mb-2">
                    Precio de Salida
                  </label>
                  <input
                    type="number"
                    step="0.00001"
                    name="exit_price"
                    value={formData.exit_price}
                    onChange={handleInputChange}
                    className="w-full p-3 bg-gray-800/60 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                    placeholder="Ej: 1.09700"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 text-sm font-medium mb-2">
                    Stop Loss
                  </label>
                  <input
                    type="number"
                    step="0.00001"
                    name="stop_loss"
                    value={formData.stop_loss}
                    onChange={handleInputChange}
                    className="w-full p-3 bg-gray-800/60 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                    placeholder="Ej: 1.09200"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 text-sm font-medium mb-2">
                    Take Profit
                  </label>
                  <input
                    type="number"
                    step="0.00001"
                    name="take_profit"
                    value={formData.take_profit}
                    onChange={handleInputChange}
                    className="w-full p-3 bg-gray-800/60 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                    placeholder="Ej: 1.09900"
                  />
                </div>
              </div>
            </div>

            {/* Gestión de riesgo */}
            <div className="bg-gray-800/30 rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-medium flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  Gestión de Riesgo
                </h3>
                <LotSizeCalculator
                  accountBalance={stats?.current_balance || 1000}
                  onLotSizeCalculated={(lotSize) => {
                    setFormData(prev => ({ ...prev, lot_size: lotSize.toString() }))
                  }}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-gray-400 text-sm font-medium mb-2">
                    Tamaño de Lote
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="lot_size"
                    value={formData.lot_size}
                    onChange={handleInputChange}
                    className="w-full p-3 bg-gray-800/60 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                    placeholder="Ej: 0.10"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 text-sm font-medium mb-2">
                    Comisión ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="commission"
                    value={formData.commission}
                    onChange={handleInputChange}
                    className="w-full p-3 bg-gray-800/60 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                    placeholder="Ej: 7.50"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 text-sm font-medium mb-2">
                    Swap ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="swap"
                    value={formData.swap}
                    onChange={handleInputChange}
                    className="w-full p-3 bg-gray-800/60 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                    placeholder="Ej: -2.30"
                  />
                </div>
              </div>
            </div>

            {/* Risk/Reward */}
            <div>
              <label className="block text-gray-400 text-sm font-medium mb-2">
                Risk/Reward Ratio
              </label>
              <input
                type="text"
                name="riskReward"
                value={formData.riskReward}
                onChange={handleInputChange}
                className="w-full p-3 bg-gray-800/60 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                placeholder="Ej: 1:2, 1:3, 1:1.5"
              />
            </div>

            {/* Confluencias */}
            <div>
              <label className="block text-gray-400 text-sm font-medium mb-2">
                Confluencias
              </label>
              <textarea
                name="confluences"
                value={formData.confluences}
                onChange={handleInputChange}
                rows={3}
                className="w-full p-3 bg-gray-800/60 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none resize-none"
                placeholder="Ej: Soporte/Resistencia, Fibonacci, Patrones, etc."
              />
            </div>

            {/* Descripción */}
            <div>
              <label className="block text-gray-400 text-sm font-medium mb-2">
                Descripción del análisis
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={4}
                className="w-full p-3 bg-gray-800/60 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none resize-none"
                placeholder="Describe tu análisis técnico, razones de entrada, etc."
              />
            </div>

            {/* Expert Advisor y Notas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-400 text-sm font-medium mb-2">
                  Expert Advisor
                </label>
                <input
                  type="text"
                  name="expert_advisor"
                  value={formData.expert_advisor}
                  onChange={handleInputChange}
                  className="w-full p-3 bg-gray-800/60 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                  placeholder="Ej: Scalping Pro v2.1, Manual"
                />
              </div>

              <div>
                <label className="block text-gray-400 text-sm font-medium mb-2">
                  Notas Adicionales
                </label>
                <input
                  type="text"
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  className="w-full p-3 bg-gray-800/60 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                  placeholder="Notas importantes del trade"
                />
              </div>
            </div>

            {/* Resultado del trade - Mejorado */}
            <div className="bg-gray-800/30 rounded-lg p-4 space-y-4">
              <h3 className="text-white font-medium flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Resultado del Trade
              </h3>
              
              <div className="grid grid-cols-3 gap-3">
                {[
                  { 
                    value: 'win', 
                    label: 'Ganancia', 
                    icon: '📈',
                    bgColor: 'bg-green-600 hover:bg-green-700',
                    borderColor: 'border-green-500',
                    textColor: 'text-green-100'
                  },
                  { 
                    value: 'loss', 
                    label: 'Pérdida', 
                    icon: '📉',
                    bgColor: 'bg-red-600 hover:bg-red-700',
                    borderColor: 'border-red-500',
                    textColor: 'text-red-100'
                  },
                  { 
                    value: 'breakeven', 
                    label: 'Break Even', 
                    icon: '➖',
                    bgColor: 'bg-yellow-600 hover:bg-yellow-700',
                    borderColor: 'border-yellow-500',
                    textColor: 'text-yellow-100'
                  }
                ].map((result) => (
                  <button
                    key={result.value}
                    type="button"
                    onClick={() => setSelectedResult(result.value)}
                    className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                      selectedResult === result.value
                        ? `${result.bgColor} ${result.borderColor} ${result.textColor} scale-105 shadow-lg`
                        : 'bg-gray-800/60 border-gray-700 text-gray-400 hover:border-gray-600 hover:bg-gray-700/60'
                    }`}
                  >
                    <div className="text-2xl mb-2">{result.icon}</div>
                    <div className="font-medium">{result.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* P&L - Mejorado */}
            <div className="bg-gray-800/30 rounded-lg p-4 space-y-4">
              <h3 className="text-white font-medium flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
                Profit & Loss
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 text-sm font-medium mb-2">
                    Tipo de P&L
                  </label>
                  <select
                    name="pnl_type"
                    value={formData.pnl_type}
                    onChange={handleInputChange}
                    className="w-full p-3 bg-gray-800/60 border border-gray-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">Selecciona tipo</option>
                    <option value="percentage">Porcentaje (%)</option>
                    <option value="pips">Pips</option>
                    <option value="money">Dinero ($)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-400 text-sm font-medium mb-2">
                    Valor P&L
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="pnl_value"
                    value={formData.pnl_value}
                    onChange={handleInputChange}
                    className="w-full p-3 bg-gray-800/60 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                    placeholder={
                      formData.pnl_type === 'percentage' ? 'Ej: 2.5' :
                      formData.pnl_type === 'pips' ? 'Ej: 25' :
                      formData.pnl_type === 'money' ? 'Ej: 150' : 'Ingresa valor'
                    }
                  />
                </div>
              </div>
            </div>

            {/* Hacer público - Toggle mejorado */}
            <div className="bg-gray-800/30 rounded-lg p-4 space-y-3">
              <h3 className="text-white font-medium flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Visibilidad del Trade
              </h3>
              
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <label htmlFor="isPublic" className="text-white font-medium cursor-pointer">
                    Hacer público en el feed
                  </label>
                  <p className="text-gray-400 text-sm mt-1">
                    Comparte tu análisis con la comunidad
                  </p>
                </div>
                
                <div className="flex items-center">
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, isPublic: !formData.isPublic})}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 ${
                      formData.isPublic ? 'bg-blue-600' : 'bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ease-in-out ${
                        formData.isPublic ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
              
              {formData.isPublic && (
                <div className="mt-3 p-3 bg-blue-900/30 border border-blue-700/50 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <svg className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="text-blue-300 font-medium text-sm">
                        ⚠️ Trade Público
                      </p>
                      <p className="text-blue-200 text-sm mt-1">
                        Todos los usuarios registrados podrán ver este trade en el feed público, incluyendo tu análisis, screenshot y resultados.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Botón de envío */}
              <button
                type="submit"
              disabled={uploadLoading || isTrialExpired}
              className={`w-full font-semibold py-3 px-6 rounded-lg transition-colors ${
                uploadLoading || isTrialExpired
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                  : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
              {uploadLoading ? 'Guardando...' : 'Guardar Trade'}
              </button>
          </form>
      </div>

        {/* Consejo de IA */}
      {showAdvice && (
          <div className="mt-8 max-w-2xl mx-auto">
            <TradeAdviceCard />
        </div>
      )}
    </div>
    </Layout>
  )
}