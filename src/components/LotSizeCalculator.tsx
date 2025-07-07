'use client'

import React, { useState, useEffect } from 'react'
import { Calculator, Info, TrendingUp, DollarSign } from 'lucide-react'

interface LotSizeCalculatorProps {
  accountBalance: number
  onLotSizeCalculated?: (lotSize: number) => void
  className?: string
}

export default function LotSizeCalculator({ 
  accountBalance, 
  onLotSizeCalculated, 
  className = '' 
}: LotSizeCalculatorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [riskPercentage, setRiskPercentage] = useState(2)
  const [entryPrice, setEntryPrice] = useState('')
  const [stopLoss, setStopLoss] = useState('')
  const [pair, setPair] = useState('EURUSD')
  const [calculatedLotSize, setCalculatedLotSize] = useState(0)
  const [riskAmount, setRiskAmount] = useState(0)
  const [pipValue, setPipValue] = useState(0)
  const [pipsAtRisk, setPipsAtRisk] = useState(0)

  // Función para obtener el valor por pip según el par
  const getPipValue = (pairSymbol: string, lotSize: number = 1): number => {
    const jpyPairs = ['USDJPY', 'EURJPY', 'GBPJPY', 'AUDJPY', 'NZDJPY', 'CADJPY', 'CHFJPY']
    const usdBasePairs = ['EURUSD', 'GBPUSD', 'AUDUSD', 'NZDUSD']
    
    if (jpyPairs.includes(pairSymbol)) {
      return lotSize * 100000 * 0.01 // Para pares JPY, 1 pip = 0.01
    } else if (usdBasePairs.includes(pairSymbol)) {
      return lotSize * 100000 * 0.0001 // Para pares USD, 1 pip = 0.0001
    } else {
      return lotSize * 100000 * 0.0001 // Valor por defecto
    }
  }

  // Calcular tamaño de lote
  const calculateLotSize = () => {
    const entry = parseFloat(entryPrice)
    const sl = parseFloat(stopLoss)
    
    if (!entry || !sl || entry === sl) {
      setCalculatedLotSize(0)
      setRiskAmount(0)
      setPipValue(0)
      setPipsAtRisk(0)
      return
    }

    // Calcular cantidad de riesgo en dinero
    const riskMoney = (accountBalance * riskPercentage) / 100
    setRiskAmount(riskMoney)

    // Calcular pips en riesgo
    let pipsRisk = 0
    const jpyPairs = ['USDJPY', 'EURJPY', 'GBPJPY', 'AUDJPY', 'NZDJPY', 'CADJPY', 'CHFJPY']
    
    if (jpyPairs.includes(pair)) {
      pipsRisk = Math.abs(entry - sl) * 100 // Para pares JPY
    } else {
      pipsRisk = Math.abs(entry - sl) * 10000 // Para otros pares
    }
    setPipsAtRisk(pipsRisk)

    if (pipsRisk === 0) {
      setCalculatedLotSize(0)
      setPipValue(0)
      return
    }

    // Calcular valor por pip para 1 lote
    const pipValueFor1Lot = getPipValue(pair, 1)
    setPipValue(pipValueFor1Lot)

    // Calcular tamaño de lote
    const lotSize = riskMoney / (pipsRisk * pipValueFor1Lot)
    const roundedLotSize = Math.round(lotSize * 100) / 100 // Redondear a 2 decimales
    
    setCalculatedLotSize(roundedLotSize)
    
    // Llamar callback si existe
    if (onLotSizeCalculated) {
      onLotSizeCalculated(roundedLotSize)
    }
  }

  // Recalcular cuando cambien los valores
  useEffect(() => {
    calculateLotSize()
  }, [riskPercentage, entryPrice, stopLoss, pair, accountBalance])

  const majorPairs = [
    'EURUSD', 'GBPUSD', 'USDCHF', 'USDJPY', 'USDCAD', 'AUDUSD', 'NZDUSD',
    'EURJPY', 'GBPJPY', 'EURGBP', 'XAUUSD', 'XAGUSD', 'BTCUSD', 'ETHUSD'
  ]

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        <Calculator className="w-4 h-4" />
        <span>Calculadora de Lotes</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white flex items-center">
                <Calculator className="w-5 h-5 mr-2" />
                Calculadora de Lotes
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* Balance de cuenta */}
              <div>
                <label className="block text-gray-400 text-sm font-medium mb-2">
                  Balance de Cuenta
                </label>
                <div className="flex items-center space-x-2 p-3 bg-gray-900 rounded-lg">
                  <DollarSign className="w-4 h-4 text-green-400" />
                  <span className="text-white font-medium">
                    ${accountBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Riesgo por trade */}
              <div>
                <label className="block text-gray-400 text-sm font-medium mb-2">
                  Riesgo por Trade: {riskPercentage}%
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="10"
                  step="0.5"
                  value={riskPercentage}
                  onChange={(e) => setRiskPercentage(Number(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>0.5%</span>
                  <span className="text-white font-medium">
                    ${riskAmount.toFixed(2)}
                  </span>
                  <span>10%</span>
                </div>
              </div>

              {/* Par de divisas */}
              <div>
                <label className="block text-gray-400 text-sm font-medium mb-2">
                  Par de Divisas
                </label>
                <select
                  value={pair}
                  onChange={(e) => setPair(e.target.value)}
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                >
                  {majorPairs.map(pairOption => (
                    <option key={pairOption} value={pairOption}>
                      {pairOption}
                    </option>
                  ))}
                </select>
              </div>

              {/* Precio de entrada */}
              <div>
                <label className="block text-gray-400 text-sm font-medium mb-2">
                  Precio de Entrada
                </label>
                <input
                  type="number"
                  step="0.00001"
                  value={entryPrice}
                  onChange={(e) => setEntryPrice(e.target.value)}
                  placeholder="Ej: 1.09450"
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Stop Loss */}
              <div>
                <label className="block text-gray-400 text-sm font-medium mb-2">
                  Stop Loss
                </label>
                <input
                  type="number"
                  step="0.00001"
                  value={stopLoss}
                  onChange={(e) => setStopLoss(e.target.value)}
                  placeholder="Ej: 1.09200"
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Resultados */}
              <div className="bg-gray-900 rounded-lg p-4 space-y-3">
                <h4 className="text-white font-medium flex items-center">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Resultados del Cálculo
                </h4>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Tamaño de Lote:</span>
                    <div className="text-white font-bold text-lg">
                      {calculatedLotSize.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-400">Pips en Riesgo:</span>
                    <div className="text-white font-bold text-lg">
                      {pipsAtRisk.toFixed(1)}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-400">Riesgo ($):</span>
                    <div className="text-red-400 font-bold">
                      ${riskAmount.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-400">Valor por Pip:</span>
                    <div className="text-white font-bold">
                      ${(pipValue * calculatedLotSize).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Información adicional */}
              <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                  <div className="text-blue-300 text-xs">
                    <p className="font-medium mb-1">Consejos:</p>
                    <ul className="space-y-1 text-xs">
                      <li>• Nunca arriesgues más del 2-3% por trade</li>
                      <li>• Verifica que tu broker permita el lote calculado</li>
                      <li>• Considera las comisiones y spreads</li>
                      <li>• Ajusta según tu tolerancia al riesgo</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    if (onLotSizeCalculated) {
                      onLotSizeCalculated(calculatedLotSize)
                    }
                    setIsOpen(false)
                  }}
                  className="flex-1 bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  Usar Lote Calculado
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="flex-1 bg-gray-600 text-white py-3 px-4 rounded-lg hover:bg-gray-700 transition-colors font-medium"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 