import React from 'react'
import Image from 'next/image'

interface LoadingSpinnerProps {
  size?: number
  className?: string
  showText?: boolean
  text?: string
}

const LoadingSpinner = React.memo(({ 
  size = 80, 
  className = '', 
  showText = true,
  text = 'Cargando...'
}: LoadingSpinnerProps) => {
  return (
    <div className={`flex flex-col items-center justify-center space-y-4 ${className}`}>
      {/* Logo con animación de pulso */}
      <div className="relative">
        <div 
          className="animate-pulse"
          style={{
            width: size,
            height: size,
          }}
        >
          <Image
            src="/logo.jpeg"
            alt="TradeTrackr Logo"
            width={size}
            height={size}
            className="rounded-full object-cover"
            priority
          />
        </div>
        
        {/* Anillo de carga giratorio alrededor del logo */}
        <div
          className="absolute inset-0 animate-spin rounded-full border-4 border-t-transparent border-blue-500/30"
          style={{
            borderTopColor: '#3B82F6',
            animationDuration: '1.5s'
          }}
        />
      </div>
      
      {/* Texto de carga */}
      {showText && (
        <div className="text-center">
          <p className="text-white font-medium text-sm">
            {text}
          </p>
          <div className="flex justify-center space-x-1 mt-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      )}
    </div>
  )
})

LoadingSpinner.displayName = 'LoadingSpinner'

export default LoadingSpinner 