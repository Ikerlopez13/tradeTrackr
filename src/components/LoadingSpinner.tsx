import Image from 'next/image'

export default function LoadingSpinner({ size = 80 }: { size?: number }) {
  return (
    <div className="flex items-center justify-center">
      <div className="relative">
        <Image
          src="/logo.jpeg"
          alt="TradeTrackr Logo"
          width={size}
          height={size}
          priority
          unoptimized
          className="animate-scale-cycle rounded-xl"
        />
      </div>
    </div>
  )
} 