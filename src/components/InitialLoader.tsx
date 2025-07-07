'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'

interface InitialLoaderProps {
  onComplete?: () => void
  minDuration?: number
}

const InitialLoader: React.FC<InitialLoaderProps> = ({ 
  onComplete, 
  minDuration = 2000 
}) => {
  const [isVisible, setIsVisible] = useState(true)
  const [progress, setProgress] = useState(0)
  const [loadingText, setLoadingText] = useState('Inicializando...')

  useEffect(() => {
    // Simular progreso de carga
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval)
          return 100
        }
        return prev + Math.random() * 15 + 5
      })
    }, 200)

    // Cambiar texto de carga
    const textInterval = setInterval(() => {
      const texts = [
        'Inicializando...',
        'Cargando datos...',
        'Preparando dashboard...',
        'Casi listo...'
      ]
      setLoadingText(texts[Math.floor(Math.random() * texts.length)])
    }, 800)

    // Completar carga después del tiempo mínimo
    const timer = setTimeout(() => {
      setProgress(100)
      setTimeout(() => {
        setIsVisible(false)
        onComplete?.()
      }, 500)
    }, minDuration)

    return () => {
      clearInterval(progressInterval)
      clearInterval(textInterval)
      clearTimeout(timer)
    }
  }, [minDuration, onComplete])

  if (!isVisible) return null

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-900 z-50 flex items-center justify-center">
      {/* Fondo animado */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-blue-500/10 rounded-full animate-pulse" />
        <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-purple-500/10 rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-green-500/5 rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* Contenido principal */}
      <div className="relative z-10 flex flex-col items-center space-y-8">
        {/* Logo con animaciones */}
        <div className="relative">
          {/* Anillos de carga */}
          <div className="absolute inset-0 w-32 h-32 rounded-full border-4 border-blue-500/30 animate-spin" style={{ animationDuration: '3s' }} />
          <div className="absolute inset-2 w-28 h-28 rounded-full border-4 border-purple-500/30 animate-spin" style={{ animationDuration: '2s', animationDirection: 'reverse' }} />
          <div className="absolute inset-4 w-24 h-24 rounded-full border-4 border-green-500/30 animate-spin" style={{ animationDuration: '4s' }} />
          
          {/* Logo central */}
          <div className="relative w-32 h-32 flex items-center justify-center">
            <div className="w-20 h-20 rounded-full overflow-hidden shadow-2xl animate-pulse">
              <Image
                src="/logo.jpeg"
                alt="TradeTrackr"
                width={80}
                height={80}
                className="w-full h-full object-cover"
                priority
              />
            </div>
          </div>
        </div>

        {/* Marca */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-white tracking-wide">
            Trade<span className="text-blue-500">Trackr</span>
          </h1>
          <p className="text-gray-400 text-sm">
            Tu plataforma de trading profesional
          </p>
        </div>

        {/* Barra de progreso */}
        <div className="w-80 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-white text-sm font-medium">
              {loadingText}
            </span>
            <span className="text-blue-400 text-sm font-mono">
              {Math.round(progress)}%
            </span>
          </div>
          
          <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Puntos de carga */}
        <div className="flex space-x-2">
          <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" />
          <div className="w-3 h-3 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
          <div className="w-3 h-3 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
        </div>
      </div>
    </div>
  )
}

export default InitialLoader 