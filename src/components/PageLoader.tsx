'use client'

import React from 'react'
import LoadingSpinner from './LoadingSpinner'

interface PageLoaderProps {
  text?: string
  size?: number
  className?: string
}

const PageLoader: React.FC<PageLoaderProps> = ({ 
  text = 'Cargando página...', 
  size = 80,
  className = ''
}) => {
  return (
    <div className={`min-h-screen flex flex-col items-center justify-center bg-gray-900 ${className}`}>
      <LoadingSpinner 
        size={size} 
        className="mb-4"
      />
      <p className="text-white text-lg font-medium">{text}</p>
    </div>
  )
}

export default PageLoader 