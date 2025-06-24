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
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [uploadLoading, setUploadLoading] = useState(false)
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
    if (!user) return

    try {
      let screenshotUrl = null

      // Subir imagen si hay una seleccionada
      if (selectedFile) {
        console.log('Subiendo imagen...')
        screenshotUrl = await uploadFile(selectedFile)
        if (!screenshotUrl) {
          console.error('No se pudo obtener URL de la imagen')
          return
        }
        console.log('Imagen subida con URL:', screenshotUrl)
      }

      console.log('Guardando trade en base de datos...')
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
          description: formData.description,
          screenshot_url: screenshotUrl
        })

      if (error) {
        console.error('Error al guardar trade:', error)
        alert(`Error al guardar el trade: ${error.message}`)
      } else {
        console.log('Trade guardado exitosamente:', data)
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
        setSelectedFile(null)
        setPreviewUrl(null)
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
    <div className="min-h-screen" style={{backgroundColor: '#010314'}}>
      {/* Navbar */}
      <nav className="max-w-4xl mx-auto pt-6 pb-4 px-6 flex justify-between items-center">
        <div className="flex items-center">
          <Image
            src="/logo.jpeg"
            alt="TradeTrackr Logo"
            width={40}
            height={40}
            priority
            unoptimized
            className="rounded-lg mr-3"
          />
          <h1 className="text-xl font-bold text-white">TradeTrackr</h1>
        </div>
        <div className="flex items-center space-x-3">
          <span className="text-gray-400 text-sm">{user.email}</span>
          <Link
            href="/trades"
            className="bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            Mis Trades
          </Link>
          <Link
            href="/profile"
            className="bg-gray-600 text-white px-3 py-1.5 rounded-lg hover:bg-gray-700 transition-colors text-sm"
          >
            Perfil
          </Link>
          <button
            onClick={handleLogout}
            className="bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 transition-colors text-sm"
          >
            Cerrar Sesión
          </button>
        </div>
      </nav>

      <div className="max-w-md mx-auto px-6 pb-8">
        {/* Título principal */}
        <h1 className="text-2xl font-bold text-white text-center mb-8">
          Registrar nuevo trade
        </h1>

        <form onSubmit={handleSubmit} className="space-y-5">
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
            onClick={() => document.getElementById('file-input')?.click()}
          >
            <input
              id="file-input"
              type="file"
              accept="image/*"
              onChange={handleFileInput}
              className="hidden"
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
            />
          </div>

          {/* Fila de campos: Temporalidad y Par */}
          <div className="grid grid-cols-2 gap-3">
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
                <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Fila de campos: Sesión y Risk:Reward */}
          <div className="grid grid-cols-2 gap-3">
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
                >
                  <option value="" className="text-gray-400">1:2</option>
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
                onClick={() => setSelectedBias('alcista')}
                className={`p-3 rounded-lg font-medium text-sm transition-all ${
                  selectedBias === 'alcista'
                    ? 'bg-green-600 text-white border border-green-500'
                    : 'bg-gray-800/60 text-gray-300 hover:bg-gray-700/60 border border-gray-600'
                }`}
              >
                Alcista
              </button>
              <button
                type="button"
                onClick={() => setSelectedBias('bajista')}
                className={`p-3 rounded-lg font-medium text-sm transition-all ${
                  selectedBias === 'bajista'
                    ? 'bg-red-600 text-white border border-red-500'
                    : 'bg-gray-800/60 text-gray-300 hover:bg-gray-700/60 border border-gray-600'
                }`}
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
                onClick={() => setSelectedResult('win')}
                className={`p-3 rounded-lg font-medium text-sm transition-all ${
                  selectedResult === 'win'
                    ? 'bg-green-600 text-white border border-green-500'
                    : 'bg-gray-800/60 text-gray-300 hover:bg-gray-700/60 border border-gray-600'
                }`}
              >
                Win
              </button>
              <button
                type="button"
                onClick={() => setSelectedResult('loss')}
                className={`p-3 rounded-lg font-medium text-sm transition-all ${
                  selectedResult === 'loss'
                    ? 'bg-red-600 text-white border border-red-500'
                    : 'bg-gray-800/60 text-gray-300 hover:bg-gray-700/60 border border-gray-600'
                }`}
              >
                Loss
              </button>
              <button
                type="button"
                onClick={() => setSelectedResult('be')}
                className={`p-3 rounded-lg font-medium text-sm transition-all ${
                  selectedResult === 'be'
                    ? 'bg-yellow-600 text-white border border-yellow-500'
                    : 'bg-gray-800/60 text-gray-300 hover:bg-gray-700/60 border border-gray-600'
                }`}
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
            />
          </div>

          {/* Slider de confianza */}
          <div>
            <label className="block text-white font-medium mb-3 text-base">
              ¿Cómo te sentiste con el trade?
            </label>
            <div className="text-center mb-4">
              <div className="flex items-center justify-center space-x-2">
                <span className="text-xl font-bold text-white">{confidence}%</span>
                <span className="text-xl">{getConfidenceEmoji(confidence)}</span>
              </div>
            </div>
            
            <div className="confidence-slider-container">
              {/* Fondo con secciones de colores */}
              <div 
                className="absolute top-1/2 left-0 w-full transform -translate-y-1/2 rounded-full overflow-hidden"
                style={{ 
                  height: '8px', 
                  zIndex: 1,
                  boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.3)'
                }}
              >
                {/* Sección roja (0-33%) */}
                <div className="absolute top-0 left-0 h-full bg-red-600" style={{ width: '33%' }}></div>
                {/* Sección amarilla (33-66%) */}
                <div className="absolute top-0 h-full bg-yellow-500" style={{ left: '33%', width: '33%' }}></div>
                {/* Sección verde (66-100%) */}
                <div className="absolute top-0 h-full bg-green-500" style={{ left: '66%', width: '34%' }}></div>
              </div>
              
              {/* Slider */}
              <input
                type="range"
                min="0"
                max="100"
                value={confidence}
                onChange={(e) => setConfidence(Number(e.target.value))}
                className="confidence-slider"
                style={{ zIndex: 5 }}
              />
            </div>
            
            {/* Labels debajo del slider */}
            <div className="flex justify-between items-center mt-2">
              <div className="flex flex-col items-center">
                <span className="text-base mb-0.5">😞</span>
                <span className="text-red-400 font-medium text-xs">Mal</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-base mb-0.5">🤔</span>
                <span className="text-yellow-400 font-medium text-xs">Regular</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-base mb-0.5">😊</span>
                <span className="text-green-400 font-medium text-xs">Genial</span>
              </div>
            </div>
          </div>

          {/* Botón de guardar */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full bg-white text-black font-semibold py-3 px-6 rounded-lg hover:bg-gray-100 transition-colors text-base shadow-lg"
            >
              Guardar Trade
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}