'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

export default function Profile() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [userCode, setUserCode] = useState('ZHPHQG')
  const [referrals, setReferrals] = useState(0)
  const [rewards, setRewards] = useState(0)
  const [proProgress, setProProgress] = useState(0)
  
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUser(user)
      setLoading(false)
    }

    getUser()
  }, [router, supabase.auth])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const copyCode = () => {
    navigator.clipboard.writeText(userCode)
    alert('¡Código copiado!')
  }

  const getUserInitials = (email: string) => {
    const parts = email.split('@')[0].split('.')
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return email.substring(0, 2).toUpperCase()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: '#010314'}}>
        <Image
          src="/logo.jpeg"
          alt="TradeTrackr Logo"
          width={100}
          height={100}
          priority
          unoptimized
          className="animate-scale-cycle"
        />
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen" style={{backgroundColor: '#010314'}}>
      {/* Navbar */}
      <nav className="max-w-4xl mx-auto pt-6 pb-4 px-6 flex justify-between items-center">
        <div className="flex items-center">
          <Image
            src="/logo.jpeg"
            alt="TradeTrackr Logo"
            width={40}
            height={40}
            priority
            unoptimized
            className="rounded-lg mr-3"
          />
          <h1 className="text-xl font-bold text-white">TradeTrackr</h1>
        </div>
        <div className="flex items-center space-x-3">
          <Link
            href="/trades"
            className="bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            Mis Trades
          </Link>
          <Link
            href="/"
            className="bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition-colors text-sm"
          >
            Nuevo Trade
          </Link>
        </div>
      </nav>

      <div className="max-w-md mx-auto px-6 pb-8">
        {/* Badge PRO */}
        <div className="flex justify-between items-center mb-6">
          <div className="bg-gray-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
            pro
          </div>
          <button className="text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>

        {/* Avatar y nombre */}
        <div className="text-center mb-8">
          <div className="w-24 h-24 bg-gray-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl font-bold">
              {getUserInitials(user.email)}
            </span>
          </div>
          <h2 className="text-white text-xl font-bold mb-1">
            {user.email.split('@')[0]}
          </h2>
          <div className="bg-gray-600 text-white px-3 py-1 rounded-full text-sm font-semibold inline-block">
            pro
          </div>
        </div>

        {/* Sección Invita y Gana */}
        <div className="bg-gray-800/60 border border-gray-600 rounded-lg p-6 mb-6">
          <div className="flex items-center mb-4">
            <div className="w-8 h-8 bg-gray-600 rounded-lg flex items-center justify-center mr-3">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h3 className="text-white font-semibold">Invita y Gana</h3>
              <p className="text-gray-400 text-sm">Comparte TradeTrackr con otros traders</p>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-gray-400 text-sm mb-2">Tu código único</label>
            <div className="flex">
              <div className="flex-1 bg-gray-700 text-white px-3 py-2 rounded-l-lg font-mono">
                {userCode}
              </div>
              <button
                onClick={copyCode}
                className="bg-white text-black px-4 py-2 rounded-r-lg hover:bg-gray-100 transition-colors font-semibold"
              >
                Compartir
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-700/50 rounded-lg p-3 text-center">
              <div className="text-white font-bold text-lg">{referrals}</div>
              <div className="text-gray-400 text-sm">Referidos activos</div>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-3 text-center">
              <div className="text-white font-bold text-lg">{rewards}</div>
              <div className="text-gray-400 text-sm">Recompensas</div>
            </div>
          </div>
        </div>

        {/* Progreso a PRO */}
        <div className="bg-gray-800/60 border border-gray-600 rounded-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-white font-semibold">Progreso a PRO</h3>
            <span className="text-gray-400 text-sm">{proProgress}/3</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
              style={{ width: `${(proProgress / 3) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Opciones adicionales */}
        <div className="space-y-3">
          <Link
            href="/trades"
            className="w-full bg-gray-800/60 border border-gray-600 rounded-lg p-4 flex items-center justify-between hover:bg-gray-700/60 transition-colors"
          >
            <div className="flex items-center">
              <svg className="w-5 h-5 text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span className="text-white">Ver Mis Trades</span>
            </div>
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>

          <Link
            href="/"
            className="w-full bg-gray-800/60 border border-gray-600 rounded-lg p-4 flex items-center justify-between hover:bg-gray-700/60 transition-colors"
          >
            <div className="flex items-center">
              <svg className="w-5 h-5 text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-white">Registrar Trade</span>
            </div>
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>

          <button
            onClick={handleLogout}
            className="w-full bg-red-600/20 border border-red-600 rounded-lg p-4 flex items-center justify-between hover:bg-red-600/30 transition-colors"
          >
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="text-red-400">Cerrar Sesión</span>
            </div>
            <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
} 