import React from 'react'
import './globals.css'

export const metadata = {
  title: 'TradeTrackr - Journal de Trading Profesional',
  description: 'Registra, analiza y mejora tus trades como un trader profesional. Lleva el control completo de tu rendimiento en los mercados financieros.',
  icons: {
    icon: '/icon.png',
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body>
        {children}
      </body>
    </html>
  )
} 