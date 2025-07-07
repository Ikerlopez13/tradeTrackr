import React from 'react'

interface LoadingSpinnerProps {
  size?: number
  color?: string
  className?: string
}

const LoadingSpinner = React.memo(({ size = 40, color = '#3B82F6', className = '' }: LoadingSpinnerProps) => {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div
        className="animate-spin rounded-full border-4 border-t-transparent"
        style={{
          width: size,
          height: size,
          borderColor: `${color}20`,
          borderTopColor: color,
          animationDuration: '1s'
        }}
      />
    </div>
  )
})

LoadingSpinner.displayName = 'LoadingSpinner'

export default LoadingSpinner 