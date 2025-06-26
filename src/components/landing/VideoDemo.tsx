'use client'

import React, { useState, useRef, useEffect } from 'react'

interface VideoDemoProps {
  title?: string
  description?: string
  videoUrl?: string
  thumbnailUrl?: string
  showPlayButton?: boolean
  startTime?: number // Tiempo de inicio en segundos
  autoPlay?: boolean
}

export default function VideoDemo({ 
  title = "Ver TradeTrackr en Acción",
  description = "Descubre cómo nuestros usuarios han transformado su trading",
  videoUrl = "/demo.mp4",
  thumbnailUrl,
  showPlayButton = true,
  startTime = 2, // Por defecto empezar en segundo 2
  autoPlay = false
}: VideoDemoProps) {
  const [isPlaying, setIsPlaying] = useState(autoPlay || !showPlayButton)
  const [isLoading, setIsLoading] = useState(false)
  const [videoDuration, setVideoDuration] = useState(0)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    // Si es autoplay, configurar inmediatamente
    if ((autoPlay || !showPlayButton) && videoRef.current) {
      const video = videoRef.current
      video.currentTime = startTime
      video.playbackRate = 1.5
      video.play().catch(console.error)
    }
  }, [showPlayButton, autoPlay, startTime])

  const handlePlay = () => {
    setIsLoading(true)
    setIsPlaying(true)
    
    // Configurar el video cuando se reproduce
    if (videoRef.current) {
      videoRef.current.currentTime = startTime
      videoRef.current.playbackRate = 1.5
      videoRef.current.play()
    }
  }

  const handleVideoLoad = () => {
    setIsLoading(false)
    if (videoRef.current) {
      setVideoDuration(videoRef.current.duration)
      // Configurar autoplay si corresponde
      if ((autoPlay || !showPlayButton)) {
        videoRef.current.currentTime = startTime
        videoRef.current.playbackRate = 1.5
      }
    }
  }

  const handleVideoEnd = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = startTime
      if (autoPlay || !showPlayButton) {
        // Si es autoplay, reiniciar automáticamente
        videoRef.current.play().catch(console.error)
      } else {
        setIsPlaying(false)
      }
    }
  }

  return (
    <div className="text-center">
      {title && (
        <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white">
          {title}
        </h2>
      )}
      {description && (
        <p className="text-xl text-gray-300 mb-12 max-w-3xl mx-auto">
          {description}
        </p>
      )}
      
      {/* Video Container */}
      <div className="relative max-w-4xl mx-auto">
        <div className="bg-gradient-to-r from-gray-800/50 to-gray-900/50 rounded-2xl border border-white/10 backdrop-blur-sm overflow-hidden shadow-2xl">
          {!isPlaying && showPlayButton && !autoPlay ? (
            // Thumbnail/Play State - Solo si showPlayButton es true y no es autoplay
            <div className="aspect-video flex items-center justify-center relative">
              {/* Background Demo Screenshot */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 to-purple-900/20">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="grid grid-cols-3 gap-4 p-8 opacity-20">
                    {/* Simulated Dashboard Elements */}
                    <div className="bg-white/10 rounded-lg h-20"></div>
                    <div className="bg-white/10 rounded-lg h-20"></div>
                    <div className="bg-white/10 rounded-lg h-20"></div>
                    <div className="bg-white/10 rounded-lg h-32 col-span-2"></div>
                    <div className="bg-white/10 rounded-lg h-32"></div>
                  </div>
                </div>
              </div>
              
              {/* Play Button */}
              <button 
                onClick={handlePlay}
                className="group relative z-10"
              >
                <div className="w-24 h-24 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-2xl">
                  <svg className="w-10 h-10 text-white ml-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="text-white font-semibold mt-4 group-hover:text-blue-300 transition-colors">
                  Ver Demo Completo
                </p>
              </button>
            </div>
          ) : (
            // Playing State - Real Video (autoplay o después de click)
            <div className="aspect-video bg-black relative">
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
                  <div className="text-white text-lg">Cargando video...</div>
                </div>
              )}
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                muted // Necesario para autoplay
                loop // Loop automático
                playsInline // Para móviles
                onLoadedData={handleVideoLoad}
                onEnded={handleVideoEnd}
                preload="metadata"
                style={{ 
                  objectFit: 'cover',
                  borderRadius: 'inherit'
                }}
              >
                <source src={videoUrl} type="video/mp4" />
                Tu navegador no soporta la reproducción de video.
              </video>
              
              {/* Close button - Solo si hay botón de play y no es autoplay */}
              {showPlayButton && !autoPlay && (
                <button
                  onClick={() => {
                    setIsPlaying(false)
                    if (videoRef.current) {
                      videoRef.current.pause()
                      videoRef.current.currentTime = startTime
                    }
                  }}
                  className="absolute top-4 right-4 bg-black/50 text-white rounded-full w-10 h-10 flex items-center justify-center hover:bg-black/70 transition-colors z-20"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          )}
        </div>
        
        {/* Floating Stats - Solo en la sección de demo */}
        {showPlayButton && (
          <>
            <div className="absolute -top-8 -left-8 bg-green-500/20 backdrop-blur-sm border border-green-500/30 rounded-lg p-4 hidden md:block">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-green-300 text-sm font-medium">+156% ROI</span>
              </div>
            </div>
            
            <div className="absolute -bottom-8 -right-8 bg-blue-500/20 backdrop-blur-sm border border-blue-500/30 rounded-lg p-4 hidden md:block">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse"></div>
                <span className="text-blue-300 text-sm font-medium">1,247 Trades Analizados</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
} 