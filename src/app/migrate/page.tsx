'use client'

import { useState } from 'react'

export default function MigratePage() {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any>(null)

  const runMigration = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/migrate-fields', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()
      setResults(data)
    } catch (error) {
      console.error('Error:', error)
      setResults({ error: 'Error ejecutando migración' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Migración de Base de Datos</h1>
        
        <div className="mb-8">
          <p className="text-gray-300 mb-4">
            Esta página ejecutará la migración para añadir los nuevos campos a la tabla trades:
          </p>
          <ul className="list-disc list-inside text-gray-300 space-y-1">
            <li>entry_price - Precio de entrada</li>
            <li>stop_loss - Precio de stop loss</li>
            <li>take_profit - Precio de take profit</li>
            <li>exit_price - Precio de salida</li>
            <li>lot_size - Tamaño del lote</li>
            <li>commission - Comisión</li>
            <li>swap - Costo de swap</li>
            <li>notes - Notas adicionales</li>
            <li>expert_advisor - Expert Advisor utilizado</li>
          </ul>
        </div>

        <button
          onClick={runMigration}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
        >
          {loading ? 'Ejecutando migración...' : 'Ejecutar migración'}
        </button>

        {results && (
          <div className="mt-8 p-4 bg-gray-800 rounded-lg">
            <h2 className="text-xl font-bold mb-4">Resultados:</h2>
            <pre className="text-sm text-gray-300 overflow-auto">
              {JSON.stringify(results, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
} 