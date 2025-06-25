'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface TradeAdvice {
  id: string
  user_id: string
  advice: string
  created_at: string
}

interface TradeAdviceCardProps {
  showOnSubmit?: boolean
  className?: string
}

export default function TradeAdviceCard({ showOnSubmit = false, className = '' }: TradeAdviceCardProps) {
  const [advice, setAdvice] = useState<TradeAdvice | null>(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      if (user) {
        await fetchLatestAdvice(user.id)
      }
      setLoading(false)
    }

    getUser()
  }, [])

  const fetchLatestAdvice = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('trade_advices')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)

      if (error) {
        console.error('Error fetching advice:', error)
        return
      }

      if (data && data.length > 0) {
        setAdvice(data[0])
      }
    } catch (err) {
      console.error('Error:', err)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 1) {
      return 'Hace 1 día'
    } else if (diffDays < 7) {
      return `Hace ${diffDays} días`
    } else {
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    }
  }

  if (loading) {
    return (
      <div className={`bg-gradient-to-r from-blue-500/10 to-purple-500/10 backdrop-blur-sm rounded-lg p-6 border border-blue-500/20 ${className}`}>
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center animate-pulse">
            <span className="text-white font-bold text-sm">AI</span>
          </div>
          <div className="flex-1">
            <div className="h-4 bg-gray-600 rounded animate-pulse mb-2"></div>
            <div className="h-3 bg-gray-700 rounded animate-pulse w-3/4"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className={`bg-gradient-to-r from-blue-500/10 to-purple-500/10 backdrop-blur-sm rounded-lg p-6 border border-blue-500/20 ${className}`}>
      {/* Header con IA */}
      <div className="flex items-center space-x-3 mb-4">
        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
          <span className="text-white font-bold text-sm">AI</span>
        </div>
        <div>
          <h3 className="text-white font-semibold text-lg">TradeTrackrAI</h3>
          <p className="text-blue-300 text-xs">Tu asistente de trading inteligente</p>
        </div>
        {/* Indicador de "pensando" */}
        <div className="ml-auto">
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
            <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
          </div>
        </div>
      </div>

      {/* Contenido del consejo */}
      {advice ? (
        <div className="space-y-4">
          {/* Burbuja de chat */}
          <div className="bg-gray-800/60 rounded-lg p-4 border-l-4 border-blue-500">
            <p className="text-white text-sm leading-relaxed">
              {advice.advice}
            </p>
          </div>

          {/* Fecha */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">
              {formatDate(advice.created_at)}
            </span>
            <div className="flex items-center space-x-1 text-blue-400">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Consejo personalizado</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-4">
          {/* Estado vacío */}
          <div className="text-4xl mb-3">🤖</div>
          <p className="text-gray-300 text-sm mb-2">
            Aún no tienes consejos
          </p>
          <p className="text-gray-400 text-xs">
            TradeTrackrAI analizará tus trades y te dará consejos personalizados
          </p>
        </div>
      )}

      {/* Footer con branding */}
      <div className="mt-4 pt-4 border-t border-gray-700/50">
        <div className="flex items-center justify-center space-x-2 text-xs text-gray-500">
          <span>Powered by</span>
          <span className="text-blue-400 font-medium">TradeTrackrAI</span>
          <div className="w-1 h-1 bg-gray-500 rounded-full"></div>
          <span>Análisis inteligente</span>
        </div>
      </div>
    </div>
  )
}

// Hook personalizado para usar en otros componentes
export const useTradeAdvice = () => {
  const [advice, setAdvice] = useState<TradeAdvice | null>(null)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const fetchLatestAdvice = async (userId: string) => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('trade_advices')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)

      if (error) {
        console.error('Error fetching advice:', error)
        return null
      }

      if (data && data.length > 0) {
        setAdvice(data[0])
        return data[0]
      }
      return null
    } catch (err) {
      console.error('Error:', err)
      return null
    } finally {
      setLoading(false)
    }
  }

  const createAdvice = async (userId: string, adviceText: string) => {
    try {
      const { data, error } = await supabase
        .from('trade_advices')
        .insert({
          user_id: userId,
          advice: adviceText
        })
        .select()

      if (error) {
        console.error('Error creating advice:', error)
        return null
      }

      if (data && data.length > 0) {
        setAdvice(data[0])
        return data[0]
      }
      return null
    } catch (err) {
      console.error('Error:', err)
      return null
    }
  }

  return {
    advice,
    loading,
    fetchLatestAdvice,
    createAdvice
  }
} 