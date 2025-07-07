'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Layout from '@/components/Layout';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Calculator, DollarSign, TrendingUp, AlertCircle, Info } from 'lucide-react';

interface CalculatorData {
  accountBalance: number;
  riskPercentage: number;
  entryPrice: number;
  stopLoss: number;
  pair: string;
  accountCurrency: string;
}

interface CalculationResult {
  lotSize: number;
  riskAmount: number;
  pipsRisk: number;
  pipValue: number;
  positionSize: number;
  marginRequired: number;
}

export default function LotCalculatorPage() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [calculatorData, setCalculatorData] = useState<CalculatorData>({
    accountBalance: 1000,
    riskPercentage: 1,
    entryPrice: 0,
    stopLoss: 0,
    pair: 'EURUSD',
    accountCurrency: 'USD'
  });
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);
      await loadUserProfile(user.id);
      setLoading(false);
    };

    getUser();
  }, [router, supabase.auth]);

  const loadUserProfile = async (userId: string) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('account_balance, account_currency')
        .eq('id', userId)
        .single();

      if (profile) {
        setProfile(profile);
        setCalculatorData(prev => ({
          ...prev,
          accountBalance: profile.account_balance || 1000,
          accountCurrency: profile.account_currency || 'USD'
        }));
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setCalculatorData(prev => ({
      ...prev,
      [name]: name === 'pair' || name === 'accountCurrency' ? value : parseFloat(value) || 0
    }));
  };

  const getPipValue = (pair: string, accountBalance: number): number => {
    if (!pair) return 0;
    
    const lotSize = accountBalance >= 10000 ? 100000 : 
                   accountBalance >= 1000 ? 10000 : 
                   1000;
    
    const jpyPairs = ['USDJPY', 'EURJPY', 'GBPJPY', 'AUDJPY', 'CADJPY', 'CHFJPY'];
    const majorPairs = ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'USDCHF', 'NZDUSD'];
    const metals = ['XAUUSD', 'XAGUSD', 'XPTUSD', 'XPDUSD'];
    const indices = ['US30', 'NAS100', 'SPX500', 'GER40', 'UK100', 'JPN225'];
    
    if (jpyPairs.includes(pair)) {
      return (lotSize * 0.01) / 100;
    } else if (majorPairs.includes(pair)) {
      return (lotSize * 0.0001) / 10;
    } else if (metals.includes(pair)) {
      if (pair === 'XAUUSD') return lotSize * 0.01 / 100;
      if (pair === 'XAGUSD') return lotSize * 0.001 / 100;
      return lotSize * 0.001 / 100;
    } else if (indices.includes(pair)) {
      return lotSize * 0.1 / 100;
    } else {
      return (lotSize * 0.0001) / 10;
    }
  };

  const calculateLotSize = () => {
    const errors: string[] = [];
    
    // Validaciones
    if (calculatorData.accountBalance <= 0) {
      errors.push('El balance de la cuenta debe ser mayor a 0');
    }
    if (calculatorData.riskPercentage <= 0 || calculatorData.riskPercentage > 100) {
      errors.push('El porcentaje de riesgo debe estar entre 0.1% y 100%');
    }
    if (calculatorData.entryPrice <= 0) {
      errors.push('El precio de entrada debe ser mayor a 0');
    }
    if (calculatorData.stopLoss <= 0) {
      errors.push('El stop loss debe ser mayor a 0');
    }
    if (calculatorData.entryPrice === calculatorData.stopLoss) {
      errors.push('El precio de entrada y stop loss no pueden ser iguales');
    }

    if (errors.length > 0) {
      setErrors(errors);
      setResult(null);
      return;
    }

    setErrors([]);

    // Cálculos
    const riskAmount = calculatorData.accountBalance * (calculatorData.riskPercentage / 100);
    const pipsRisk = Math.abs(calculatorData.entryPrice - calculatorData.stopLoss) * 10000;
    const pipValue = getPipValue(calculatorData.pair, calculatorData.accountBalance);
    
    // Tamaño del lote basado en el riesgo
    const lotSize = pipValue > 0 ? riskAmount / (pipsRisk * pipValue) : 0;
    
    // Tamaño de la posición en unidades de la divisa base
    const positionSize = lotSize * (calculatorData.accountBalance >= 10000 ? 100000 : 
                                   calculatorData.accountBalance >= 1000 ? 10000 : 1000);
    
    // Margen requerido (aproximado al 2% para pares mayores)
    const marginRequired = positionSize * 0.02;

    setResult({
      lotSize: Math.round(lotSize * 100) / 100,
      riskAmount: Math.round(riskAmount * 100) / 100,
      pipsRisk: Math.round(pipsRisk * 10) / 10,
      pipValue: Math.round(pipValue * 100) / 100,
      positionSize: Math.round(positionSize),
      marginRequired: Math.round(marginRequired * 100) / 100
    });
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <LoadingSpinner size={100} />
        </div>
      </Layout>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <Layout>
      <div className="pb-20 md:pb-8">
        <div className="max-w-4xl mx-auto px-4 py-6">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 flex items-center gap-3">
              <Calculator className="w-8 h-8 text-blue-400" />
              Calculadora de Lotes
            </h1>
            <p className="text-gray-400 text-lg">
              Calcula el tamaño de lote óptimo basado en tu gestión de riesgo
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Formulario de entrada */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-400" />
                Parámetros de Cálculo
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-gray-400 text-sm font-medium mb-2">
                    Balance de la Cuenta
                  </label>
                  <input
                    type="number"
                    name="accountBalance"
                    value={calculatorData.accountBalance}
                    onChange={handleInputChange}
                    className="w-full p-3 bg-gray-800/60 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                    placeholder="1000"
                    min="1"
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 text-sm font-medium mb-2">
                    Riesgo por Trade (%)
                  </label>
                  <input
                    type="number"
                    name="riskPercentage"
                    value={calculatorData.riskPercentage}
                    onChange={handleInputChange}
                    className="w-full p-3 bg-gray-800/60 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                    placeholder="1"
                    min="0.1"
                    max="100"
                    step="0.1"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 text-sm font-medium mb-2">
                    Par de Divisas
                  </label>
                  <select
                    name="pair"
                    value={calculatorData.pair}
                    onChange={handleInputChange}
                    className="w-full p-3 bg-gray-800/60 border border-gray-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="EURUSD">EUR/USD</option>
                    <option value="GBPUSD">GBP/USD</option>
                    <option value="USDJPY">USD/JPY</option>
                    <option value="USDCHF">USD/CHF</option>
                    <option value="USDCAD">USD/CAD</option>
                    <option value="AUDUSD">AUD/USD</option>
                    <option value="NZDUSD">NZD/USD</option>
                    <option value="EURJPY">EUR/JPY</option>
                    <option value="GBPJPY">GBP/JPY</option>
                    <option value="EURGBP">EUR/GBP</option>
                    <option value="XAUUSD">XAU/USD (Gold)</option>
                    <option value="XAGUSD">XAG/USD (Silver)</option>
                    <option value="US30">US30</option>
                    <option value="NAS100">NAS100</option>
                    <option value="SPX500">SPX500</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-400 text-sm font-medium mb-2">
                    Precio de Entrada
                  </label>
                  <input
                    type="number"
                    name="entryPrice"
                    value={calculatorData.entryPrice}
                    onChange={handleInputChange}
                    className="w-full p-3 bg-gray-800/60 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                    placeholder="1.1000"
                    min="0"
                    step="0.0001"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 text-sm font-medium mb-2">
                    Stop Loss
                  </label>
                  <input
                    type="number"
                    name="stopLoss"
                    value={calculatorData.stopLoss}
                    onChange={handleInputChange}
                    className="w-full p-3 bg-gray-800/60 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                    placeholder="1.0950"
                    min="0"
                    step="0.0001"
                  />
                </div>

                <button
                  onClick={calculateLotSize}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Calculator className="w-5 h-5" />
                  Calcular Tamaño de Lote
                </button>
              </div>
            </div>

            {/* Resultados */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-400" />
                Resultados del Cálculo
              </h2>

              {errors.length > 0 && (
                <div className="mb-6 p-4 bg-red-900/20 border border-red-500/50 rounded-lg">
                  <div className="flex items-center gap-2 text-red-400 font-medium mb-2">
                    <AlertCircle className="w-5 h-5" />
                    Errores de Validación
                  </div>
                  <ul className="text-red-300 text-sm space-y-1">
                    {errors.map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                </div>
              )}

              {result && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-gray-900/50 rounded-lg p-4">
                      <div className="text-gray-400 text-sm font-medium mb-1">Tamaño de Lote</div>
                      <div className="text-2xl font-bold text-blue-400">{result.lotSize}</div>
                    </div>

                    <div className="bg-gray-900/50 rounded-lg p-4">
                      <div className="text-gray-400 text-sm font-medium mb-1">Riesgo en Dinero</div>
                      <div className="text-2xl font-bold text-red-400">${result.riskAmount}</div>
                    </div>

                    <div className="bg-gray-900/50 rounded-lg p-4">
                      <div className="text-gray-400 text-sm font-medium mb-1">Riesgo en Pips</div>
                      <div className="text-2xl font-bold text-yellow-400">{result.pipsRisk}</div>
                    </div>

                    <div className="bg-gray-900/50 rounded-lg p-4">
                      <div className="text-gray-400 text-sm font-medium mb-1">Valor por Pip</div>
                      <div className="text-2xl font-bold text-purple-400">${result.pipValue}</div>
                    </div>

                    <div className="bg-gray-900/50 rounded-lg p-4">
                      <div className="text-gray-400 text-sm font-medium mb-1">Tamaño Posición</div>
                      <div className="text-2xl font-bold text-green-400">{result.positionSize.toLocaleString()}</div>
                    </div>

                    <div className="bg-gray-900/50 rounded-lg p-4">
                      <div className="text-gray-400 text-sm font-medium mb-1">Margen Requerido</div>
                      <div className="text-2xl font-bold text-orange-400">${result.marginRequired}</div>
                    </div>
                  </div>

                  <div className="bg-blue-900/20 border border-blue-500/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-blue-400 font-medium mb-2">
                      <Info className="w-5 h-5" />
                      Resumen del Trade
                    </div>
                    <div className="text-gray-300 text-sm space-y-1">
                      <p>• Con un lote de <strong>{result.lotSize}</strong>, arriesgas <strong>${result.riskAmount}</strong> ({calculatorData.riskPercentage}% de tu cuenta)</p>
                      <p>• Cada pip te costará <strong>${result.pipValue}</strong></p>
                      <p>• El stop loss está a <strong>{result.pipsRisk}</strong> pips de distancia</p>
                      <p>• Necesitas <strong>${result.marginRequired}</strong> de margen para esta posición</p>
                    </div>
                  </div>
                </div>
              )}

              {!result && errors.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <Calculator className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>Completa los campos y haz clic en "Calcular" para ver los resultados</p>
                </div>
              )}
            </div>
          </div>

          {/* Información adicional */}
          <div className="mt-8 bg-gray-800/30 rounded-xl p-6 border border-gray-700/50">
            <h3 className="text-lg font-bold text-white mb-4">📚 Cómo usar la Calculadora</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-gray-300 text-sm">
              <div>
                <h4 className="font-medium text-white mb-2">1. Balance de la Cuenta</h4>
                <p>Ingresa el balance total de tu cuenta de trading.</p>
              </div>
              <div>
                <h4 className="font-medium text-white mb-2">2. Riesgo por Trade</h4>
                <p>Porcentaje de tu cuenta que estás dispuesto a arriesgar (recomendado: 1-2%).</p>
              </div>
              <div>
                <h4 className="font-medium text-white mb-2">3. Precio de Entrada</h4>
                <p>El precio al que planeas entrar al mercado.</p>
              </div>
              <div>
                <h4 className="font-medium text-white mb-2">4. Stop Loss</h4>
                <p>El precio al que saldrás si el trade va en tu contra.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
} 