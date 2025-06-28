'use client'

import React, { useRef, useState, useEffect } from 'react'
import { Camera, X, RotateCcw, Check, Upload, Image as ImageIcon, Smartphone } from 'lucide-react'

interface CameraCaptureProps {
  onCapture: (file: File) => void
  onClose: () => void
  isOpen: boolean
}

export default function CameraCapture({ onCapture, onClose, isOpen }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment')
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([])

  // Detectar si es móvil
  const isMobile = typeof window !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)

  useEffect(() => {
    if (isOpen) {
      checkCameraSupport()
      startCamera()
    } else {
      stopCamera()
    }

    return () => {
      stopCamera()
    }
  }, [isOpen, facingMode])

  const checkCameraSupport = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices()
        const cameras = devices.filter(device => device.kind === 'videoinput')
        setAvailableCameras(cameras)
      }
    } catch (err) {
      console.warn('Could not enumerate devices:', err)
    }
  }

  const startCamera = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Verificar si el navegador soporta getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Tu navegador no soporta acceso a la cámara')
      }

      // Configuración más robusta para diferentes dispositivos
      const baseConstraints: MediaStreamConstraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1920, max: 1920, min: 640 },
          height: { ideal: 1080, max: 1080, min: 480 }
        },
        audio: false
      }

      // Intentar con configuración ideal primero
      let mediaStream: MediaStream
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia(baseConstraints)
      } catch (err) {
        // Si falla, intentar con configuración más básica
        console.warn('Failed with ideal constraints, trying basic:', err)
        const basicConstraints: MediaStreamConstraints = {
          video: {
            facingMode: facingMode
          },
          audio: false
        }
        mediaStream = await navigator.mediaDevices.getUserMedia(basicConstraints)
      }

      setStream(mediaStream)

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        
        // Asegurar que el video se reproduzca en móviles
        videoRef.current.playsInline = true
        videoRef.current.muted = true
        
        try {
          await videoRef.current.play()
        } catch (playError) {
          console.warn('Video play failed:', playError)
          // En algunos casos móviles requieren interacción del usuario
        }
      }
    } catch (err: any) {
      console.error('Error accessing camera:', err)
      setError(
        err.name === 'NotAllowedError' 
          ? 'Permiso denegado. Por favor permite el acceso a la cámara en la configuración de tu navegador.' 
          : err.name === 'NotFoundError'
          ? 'No se encontró ninguna cámara en tu dispositivo.'
          : err.name === 'NotSupportedError'
          ? 'Tu navegador no soporta acceso a la cámara.'
          : err.name === 'OverconstrainedError'
          ? 'No se pudo acceder a la cámara con la configuración solicitada.'
          : 'Error al acceder a la cámara. Intenta recargar la página.'
      )
    } finally {
      setIsLoading(false)
    }
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
  }

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')

    if (!context) return

    // Configurar el canvas con las dimensiones del video
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // Dibujar el frame actual del video en el canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Convertir a imagen con buena calidad
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.85)
    setCapturedImage(imageDataUrl)
  }

  const confirmCapture = () => {
    if (!capturedImage || !canvasRef.current) return

    // Convertir dataURL a File
    canvasRef.current.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `trade-screenshot-${Date.now()}.jpg`, {
          type: 'image/jpeg'
        })
        onCapture(file)
        handleClose()
      }
    }, 'image/jpeg', 0.85)
  }

  const retakePhoto = () => {
    setCapturedImage(null)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onCapture(file)
      handleClose()
    }
  }

  const handleClose = () => {
    setCapturedImage(null)
    setError(null)
    stopCamera()
    onClose()
  }

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user')
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black" style={{ touchAction: 'none' }}>
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent p-4 safe-area-top">
        <div className="flex justify-between items-center">
          <button
            onClick={handleClose}
            className="p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors touch-manipulation"
          >
            <X size={24} />
          </button>
          
          <h2 className="text-white font-semibold text-lg">
            Capturar Screenshot
          </h2>
          
          {isMobile && !capturedImage && availableCameras.length > 1 && (
            <button
              onClick={toggleCamera}
              className="p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors touch-manipulation"
            >
              <RotateCcw size={24} />
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="h-full flex flex-col">
        {error ? (
          // Error State
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="text-red-400 text-6xl mb-4">📷</div>
            <h3 className="text-white text-xl font-semibold mb-2">Error de Cámara</h3>
            <p className="text-gray-300 mb-6 text-sm leading-relaxed">{error}</p>
            
            <div className="space-y-3 w-full max-w-sm">
              <button
                onClick={startCamera}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-medium transition-colors touch-manipulation"
              >
                Intentar de Nuevo
              </button>
              
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full bg-gray-700 hover:bg-gray-600 text-white py-3 px-6 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 touch-manipulation"
              >
                <ImageIcon size={20} />
                Seleccionar de Galería
              </button>
            </div>
            
            {isMobile && (
              <p className="text-gray-400 text-xs mt-4 text-center">
                💡 Consejo: Asegúrate de permitir el acceso a la cámara cuando el navegador lo solicite
              </p>
            )}
          </div>
        ) : isLoading ? (
          // Loading State
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4"></div>
            <p className="text-white text-lg">Iniciando cámara...</p>
            {isMobile && (
              <p className="text-gray-400 text-sm mt-2 text-center px-4">
                Si es la primera vez, permite el acceso a la cámara
              </p>
            )}
          </div>
        ) : capturedImage ? (
          // Preview State
          <div className="flex-1 flex flex-col">
            <div className="flex-1 flex items-center justify-center p-4">
              <img
                src={capturedImage}
                alt="Captured"
                className="max-w-full max-h-full rounded-lg shadow-lg"
              />
            </div>
            
            {/* Preview Controls */}
            <div className="p-6 bg-gradient-to-t from-black/80 to-transparent safe-area-bottom">
              <div className="flex gap-4">
                <button
                  onClick={retakePhoto}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 px-6 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 touch-manipulation"
                >
                  <RotateCcw size={20} />
                  Repetir
                </button>
                
                <button
                  onClick={confirmCapture}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 px-6 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 touch-manipulation"
                >
                  <Check size={20} />
                  Usar Foto
                </button>
              </div>
            </div>
          </div>
        ) : (
          // Camera State
          <div className="flex-1 flex flex-col">
            <div className="flex-1 relative overflow-hidden">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                muted
                autoPlay
              />
              
              {/* Camera overlay */}
              <div className="absolute inset-0 pointer-events-none">
                {/* Grid lines */}
                <div className="absolute inset-4 border border-white/20">
                  <div className="absolute top-1/3 left-0 right-0 border-t border-white/20"></div>
                  <div className="absolute top-2/3 left-0 right-0 border-t border-white/20"></div>
                  <div className="absolute left-1/3 top-0 bottom-0 border-l border-white/20"></div>
                  <div className="absolute left-2/3 top-0 bottom-0 border-l border-white/20"></div>
                </div>
                
                {/* Indicador de cámara activa */}
                <div className="absolute top-4 right-4 bg-red-600 text-white px-2 py-1 rounded-full text-xs font-medium">
                  ● REC
                </div>
              </div>
            </div>
            
            {/* Camera Controls */}
            <div className="p-6 bg-gradient-to-t from-black/80 to-transparent safe-area-bottom">
              <div className="flex items-center justify-center gap-8">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-4 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors touch-manipulation"
                >
                  <ImageIcon size={24} />
                </button>
                
                <button
                  onClick={capturePhoto}
                  className="w-16 h-16 rounded-full bg-white border-4 border-gray-300 hover:border-gray-400 transition-colors flex items-center justify-center touch-manipulation active:scale-95"
                >
                  <div className="w-12 h-12 rounded-full bg-white shadow-inner"></div>
                </button>
                
                {isMobile && availableCameras.length > 1 ? (
                  <button
                    onClick={toggleCamera}
                    className="p-4 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors touch-manipulation"
                  >
                    <Smartphone size={24} />
                  </button>
                ) : (
                  <div className="w-12 h-12"></div>
                )}
              </div>
              
              <p className="text-center text-white/70 text-sm mt-4">
                Toca el botón blanco para capturar
              </p>
              
              {facingMode === 'environment' && (
                <p className="text-center text-white/50 text-xs mt-2">
                  📱 Cámara trasera activa
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Hidden canvas for image processing */}
      <canvas ref={canvasRef} className="hidden" />
      
      {/* Hidden file input for gallery selection */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  )
} 