import React from 'react'
import './globals.css'

export const metadata = {
  title: 'TradeTracker',
  description: 'Registra y analiza tus trades',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body>
        {children}
      </body>
    </html>
  )
} 