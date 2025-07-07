'use client'

import React from 'react'
import Image from 'next/image'

interface LoadingSpinnerProps {
  size?: number
  className?: string
}

const LoadingSpinner = React.memo(({ 
  size = 120, 
  className = ''
}: LoadingSpinnerProps) => {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <Image
        src="/logo.jpeg"
        alt="TradeTrackr Logo"
        width={size}
        height={size}
        priority
        unoptimized
        className="animate-scale-cycle"
      />
    </div>
  )
})

LoadingSpinner.displayName = 'LoadingSpinner'

export default LoadingSpinner 