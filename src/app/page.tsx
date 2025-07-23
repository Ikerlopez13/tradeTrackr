'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Layout from '@/components/Layout';
import LoadingSpinner from '@/components/LoadingSpinner';
import PnLCalculator from '@/components/PnLCalculator';
import { 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  DollarSign,
  Target,
  Camera,
  FileText,
  Upload,
  X,
  Clock,
  BarChart3,
  Smile,
  Globe,
  Lock
} from 'lucide-react';

const STEPS = [
  { id: 1, title: 'Información Básica', icon: Calendar },
  { id: 2, title: 'Precios', icon: DollarSign },
  { id: 3, title: 'Resultados', icon: Target },
  { id: 4, title: 'Notas', icon: FileText },
  { id: 5, title: 'Sentimientos', icon: Smile }
];

export default function JournalingPage() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingAdvice, setIsGeneratingAdvice] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [generatedAdvice, setGeneratedAdvice] = useState('');
  
  // Form data matching the actual database schema
  const [formData, setFormData] = useState({
    title: '',
    pair: '',
    timeframe: '',
    session: '',
    bias: '',
    risk_reward: '',
    entry_price: '',
    exit_price: '',
    stop_loss: '',
    take_profit: '',
    result: '',
    pnl_percentage: '',
    pnl_pips: '',
    pnl_money: '',
    description: '',
    confluences: '',
    feeling: 50,
    is_public: false,
    images: [] as File[]
  });

  // Estado para el balance de cuenta del usuario
  const [accountBalance, setAccountBalance] = useState(1000);

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
      
      // Cargar balance de cuenta del usuario
      const { data: profile } = await supabase
        .from('profiles')
        .select('account_balance')
        .eq('id', user.id)
        .single();
      
      if (profile?.account_balance) {
        setAccountBalance(profile.account_balance);
      }
      
      setLoading(false);
    };

    getUser();
  }, [router]);

  // Función para calcular P&L automáticamente
  const calculatePnL = (field: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    
    if (field === 'pnl_money' && value !== '') {
      // Calcular porcentaje basado en dinero
      const percentage = (numValue / accountBalance) * 100;
      setFormData(prev => ({
        ...prev,
        pnl_money: value,
        pnl_percentage: percentage.toFixed(4)
      }));
    } else if (field === 'pnl_percentage' && value !== '') {
      // Calcular dinero basado en porcentaje  
      const money = (accountBalance * numValue) / 100;
      setFormData(prev => ({
        ...prev,
        pnl_percentage: value,
        pnl_money: money.toFixed(2)
      }));
    } else {
      // Actualización normal sin cálculo
      updateFormData(field, value);
    }
  };

  // Manejador para cambios en el componente PnLCalculator
  const handlePnLChange = (money: string, percentage: string) => {
    setFormData(prev => ({
      ...prev,
      pnl_money: money,
      pnl_percentage: percentage
    }));
  };

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const nextStep = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.title && formData.pair && formData.timeframe && formData.bias && formData.risk_reward;
      case 2:
        return formData.entry_price && formData.exit_price;
      case 3:
        return formData.result && formData.pnl_money;
      case 4:
        return true; // Notes are optional
      case 5:
        return true; // Feeling has default value
      default:
        return false;
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setFormData(prev => ({ ...prev, images: [...prev.images, ...files] }));
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  // AI Advice Generation Function
  const generateAIAdvice = async (tradeData: any) => {
    try {
      setIsGeneratingAdvice(true);
      
      // Generate AI advice using a simple approach (can be replaced with OpenAI API later)
      const adviceText = generateSimpleAdvice(tradeData);
      setGeneratedAdvice(adviceText);
      
      // Save the advice to the database
      const { error } = await supabase
        .from('trade_advices')
        .insert({
          user_id: user.id,
          advice: adviceText
        });

      if (error) {
        console.error('Error saving AI advice:', error);
      }

      // Show the AI modal
      setShowAIModal(true);

    } catch (error) {
      console.error('Error generating AI advice:', error);
    } finally {
      setIsGeneratingAdvice(false);
    }
  };

  // Simple AI advice generation (can be replaced with OpenAI API)
  const generateSimpleAdvice = (tradeData: any) => {
    const isWin = tradeData.result === 'win';
    const isLoss = tradeData.result === 'loss';
    const isBE = tradeData.result === 'be';
    const confidence = parseInt(tradeData.feeling) || 50;
    const hasStopLoss = tradeData.stop_loss && tradeData.stop_loss !== '';
    const hasTakeProfit = tradeData.take_profit && tradeData.take_profit !== '';
    
    let advice = '';
    
    // Result-based advice
    if (isWin) {
      advice += `¡Excelente trabajo en este trade ganador! `;
      if (confidence >= 70) {
        advice += `Tu alta confianza (${confidence}%) se vio reflejada en el resultado positivo. `;
      }
      advice += `Mantén la disciplina que te llevó a este éxito. `;
    } else if (isLoss) {
      advice += `Aunque este trade resultó en pérdida, es parte del proceso de aprendizaje. `;
      if (confidence < 50) {
        advice += `Tu nivel de confianza (${confidence}%) sugiere que tal vez hubo dudas. Trabaja en confirmar mejor tus confluencias antes de entrar. `;
      }
    } else if (isBE) {
      advice += `Un trade en breakeven es mejor que una pérdida. `;
    }
    
    // Risk management advice
    if (!hasStopLoss) {
      advice += `⚠️ Recomendación importante: Siempre define un stop loss antes de entrar al trade. `;
    }
    
    if (!hasTakeProfit) {
      advice += `Considera definir un take profit para asegurar ganancias. `;
    }
    
    // Timeframe specific advice
    if (tradeData.timeframe === '1m' || tradeData.timeframe === '5m') {
      advice += `Los timeframes bajos requieren reacciones rápidas. Asegúrate de tener tiempo suficiente para monitorear. `;
    } else if (tradeData.timeframe === '1d' || tradeData.timeframe === '1w') {
      advice += `Los timeframes altos requieren paciencia. Mantén tu análisis a largo plazo. `;
    }
    
    // Pair-specific advice
    if (tradeData.pair.includes('JPY')) {
      advice += `Los pares con JPY pueden ser más volátiles. Ajusta tu gestión de riesgo en consecuencia. `;
    }
    
    // General closing advice
    advice += `Sigue registrando tus trades para identificar patrones y mejorar consistentemente. ¡Continúa así!`;
    
    return advice.trim();
  };

  const handleSubmit = async () => {
    if (!user) return;

    setIsSubmitting(true);
    
    try {
      // Upload images first
      let screenshot_url = null;
      if (formData.images.length > 0) {
        const image = formData.images[0]; // Use first image as screenshot
        const fileName = `${user.id}/${Date.now()}_${image.name}`;
        const { data, error } = await supabase.storage
          .from('trade-screenshots')
          .upload(fileName, image);
        
        if (data) {
          const { data: { publicUrl } } = supabase.storage
            .from('trade-screenshots')
            .getPublicUrl(fileName);
          screenshot_url = publicUrl;
        }
      }

      // Create trade record matching the database schema
      const tradeData = {
        user_id: user.id,
        title: formData.title,
        pair: formData.pair,
        timeframe: formData.timeframe,
        session: formData.session || null,
        bias: formData.bias,
        risk_reward: formData.risk_reward,
        result: formData.result,
        feeling: formData.feeling,
        description: formData.description || null,
        confluences: formData.confluences || null,
        screenshot_url: screenshot_url,
        is_public: formData.is_public,
        // Additional fields if they exist in the database
        entry_price: formData.entry_price ? parseFloat(formData.entry_price) : null,
        exit_price: formData.exit_price ? parseFloat(formData.exit_price) : null,
        stop_loss: formData.stop_loss ? parseFloat(formData.stop_loss) : null,
        take_profit: formData.take_profit ? parseFloat(formData.take_profit) : null,
        pnl_percentage: formData.pnl_percentage ? parseFloat(formData.pnl_percentage) : null,
        pnl_pips: formData.pnl_pips ? parseFloat(formData.pnl_pips) : null,
        pnl_money: formData.pnl_money ? parseFloat(formData.pnl_money) : null
      };

      const { error } = await supabase
        .from('trades')
        .insert([tradeData]);

      if (error) {
        console.error('Error creating trade:', error);
        throw error;
      }

      // Generate AI advice after successful trade creation
      await generateAIAdvice(tradeData);

      // Reset form
      setFormData({
        title: '',
        pair: '',
        timeframe: '',
        session: '',
        bias: '',
        risk_reward: '',
        entry_price: '',
        exit_price: '',
        stop_loss: '',
        take_profit: '',
        result: '',
        pnl_percentage: '',
        pnl_pips: '',
        pnl_money: '',
        description: '',
        confluences: '',
        feeling: 50,
        is_public: false,
        images: []
      });
      
      setCurrentStep(1);
      
    } catch (error) {
      console.error('Error creating trade:', error);
      alert('Error al registrar el trade');
    } finally {
      setIsSubmitting(false);
    }
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

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <Calendar className="w-16 h-16 text-blue-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">Información Básica</h2>
              <p className="text-gray-400">Comencemos con los datos fundamentales del trade</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Título del Trade *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => updateFormData('title', e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ej: EUR/USD Long breakout"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Par de Divisas *</label>
                  <select
                    value={formData.pair}
                    onChange={(e) => updateFormData('pair', e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Seleccionar par</option>
                    <option value="EURUSD">EUR/USD</option>
                    <option value="GBPUSD">GBP/USD</option>
                    <option value="USDJPY">USD/JPY</option>
                    <option value="USDCHF">USD/CHF</option>
                    <option value="AUDUSD">AUD/USD</option>
                    <option value="USDCAD">USD/CAD</option>
                    <option value="NZDUSD">NZD/USD</option>
                    <option value="EURGBP">EUR/GBP</option>
                    <option value="EURJPY">EUR/JPY</option>
                    <option value="GBPJPY">GBP/JPY</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Timeframe *</label>
                  <select
                    value={formData.timeframe}
                    onChange={(e) => updateFormData('timeframe', e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Seleccionar timeframe</option>
                    <option value="1m">1 Minuto</option>
                    <option value="5m">5 Minutos</option>
                    <option value="15m">15 Minutos</option>
                    <option value="30m">30 Minutos</option>
                    <option value="1h">1 Hora</option>
                    <option value="4h">4 Horas</option>
                    <option value="1d">1 Día</option>
                    <option value="1w">1 Semana</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Sesión</label>
                  <select
                    value={formData.session}
                    onChange={(e) => updateFormData('session', e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Seleccionar sesión</option>
                    <option value="Asian">Asiática</option>
                    <option value="London">Londres</option>
                    <option value="New York">Nueva York</option>
                    <option value="Sydney">Sydney</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Risk/Reward *</label>
                  <input
                    type="text"
                    value={formData.risk_reward}
                    onChange={(e) => updateFormData('risk_reward', e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ej: 1:2, 1:3"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Bias *</label>
                <div className="grid grid-cols-3 gap-4">
                  <button
                    type="button"
                    onClick={() => updateFormData('bias', 'bullish')}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      formData.bias === 'bullish'
                        ? 'border-green-500 bg-green-500/20 text-green-400'
                        : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-green-500'
                    }`}
                  >
                    <TrendingUp className="w-6 h-6 mx-auto mb-2" />
                    <span className="font-medium">BULLISH</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => updateFormData('bias', 'bearish')}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      formData.bias === 'bearish'
                        ? 'border-red-500 bg-red-500/20 text-red-400'
                        : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-red-500'
                    }`}
                  >
                    <TrendingDown className="w-6 h-6 mx-auto mb-2" />
                    <span className="font-medium">BEARISH</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => updateFormData('bias', 'neutral')}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      formData.bias === 'neutral'
                        ? 'border-yellow-500 bg-yellow-500/20 text-yellow-400'
                        : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-yellow-500'
                    }`}
                  >
                    <BarChart3 className="w-6 h-6 mx-auto mb-2" />
                    <span className="font-medium">NEUTRAL</span>
                  </button>
                </div>
              </div>

              {/* Image Upload Section */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Capturas de Pantalla</label>
                <div className="border-2 border-dashed border-gray-700 rounded-lg p-6 text-center">
                  <Camera className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-400 mb-4">Arrastra y suelta las imágenes aquí o haz clic para seleccionar</p>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="image-upload"
                  />
                  <label
                    htmlFor="image-upload"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg cursor-pointer transition-colors"
                  >
                    Seleccionar Imágenes
                  </label>
                </div>

                {formData.images.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                    {formData.images.map((image, index) => (
                      <div key={index} className="relative">
                        <img
                          src={URL.createObjectURL(image)}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg"
                        />
                        <button
                          onClick={() => removeImage(index)}
                          className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <DollarSign className="w-16 h-16 text-green-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">Precios</h2>
              <p className="text-gray-400">Registra los precios de entrada y salida</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Precio de Entrada *</label>
                <input
                  type="number"
                  step="0.00001"
                  value={formData.entry_price}
                  onChange={(e) => updateFormData('entry_price', e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="1.08500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Precio de Salida *</label>
                <input
                  type="number"
                  step="0.00001"
                  value={formData.exit_price}
                  onChange={(e) => updateFormData('exit_price', e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="1.08750"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Stop Loss (opcional)</label>
                <input
                  type="number"
                  step="0.00001"
                  value={formData.stop_loss}
                  onChange={(e) => updateFormData('stop_loss', e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="1.08200"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Take Profit (opcional)</label>
                <input
                  type="number"
                  step="0.00001"
                  value={formData.take_profit}
                  onChange={(e) => updateFormData('take_profit', e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="1.09000"
                />
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <Target className="w-16 h-16 text-purple-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">Resultados</h2>
              <p className="text-gray-400">¿Cómo terminó el trade?</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Resultado *</label>
              <div className="grid grid-cols-3 gap-4">
                <button
                  type="button"
                  onClick={() => updateFormData('result', 'win')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    formData.result === 'win'
                      ? 'border-green-500 bg-green-500/20 text-green-400'
                      : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-green-500'
                  }`}
                >
                  <TrendingUp className="w-6 h-6 mx-auto mb-2" />
                  <span className="font-medium">WIN</span>
                </button>
                <button
                  type="button"
                  onClick={() => updateFormData('result', 'loss')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    formData.result === 'loss'
                      ? 'border-red-500 bg-red-500/20 text-red-400'
                      : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-red-500'
                  }`}
                >
                  <TrendingDown className="w-6 h-6 mx-auto mb-2" />
                  <span className="font-medium">LOSS</span>
                </button>
                <button
                  type="button"
                  onClick={() => updateFormData('result', 'be')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    formData.result === 'be'
                      ? 'border-yellow-500 bg-yellow-500/20 text-yellow-400'
                      : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-yellow-500'
                  }`}
                >
                  <Target className="w-6 h-6 mx-auto mb-2" />
                  <span className="font-medium">BE</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Componente mejorado de P&L */}
              <div className="md:col-span-2">
                <PnLCalculator
                  accountBalance={accountBalance}
                  pnl_money={formData.pnl_money}
                  pnl_percentage={formData.pnl_percentage}
                  onPnLChange={handlePnLChange}
                />
              </div>

              {/* Campo de Pips */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Pips</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.pnl_pips}
                  onChange={(e) => updateFormData('pnl_pips', e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="25"
                />
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <FileText className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">Notas y Análisis</h2>
              <p className="text-gray-400">Reflexiona sobre tu trade</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Descripción del Trade</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => updateFormData('description', e.target.value)}
                  rows={4}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="¿Qué pasó en el trade? ¿Se cumplió tu análisis?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Confluencias</label>
                <textarea
                  value={formData.confluences}
                  onChange={(e) => updateFormData('confluences', e.target.value)}
                  rows={4}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="¿Qué confluencias utilizaste? (soportes, resistencias, patrones, etc.)"
                />
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <Smile className="w-16 h-16 text-pink-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">Sentimientos y Visibilidad</h2>
              <p className="text-gray-400">Evalúa tu estado emocional y decide la visibilidad</p>
            </div>

            <div className="space-y-8">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-4">
                  Nivel de Confianza: {formData.feeling}%
                </label>
                <div className="relative">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={formData.feeling}
                    onChange={(e) => updateFormData('feeling', parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-2">
                    <span>0% - Muy Nervioso</span>
                    <span>50% - Neutral</span>
                    <span>100% - Muy Confiado</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className={`p-4 rounded-lg border-2 text-center ${
                  formData.feeling <= 33 ? 'border-red-500 bg-red-500/20' : 'border-gray-700 bg-gray-800'
                }`}>
                  <div className="text-2xl mb-2">😰</div>
                  <span className="text-sm">Nervioso</span>
                </div>
                <div className={`p-4 rounded-lg border-2 text-center ${
                  formData.feeling > 33 && formData.feeling <= 66 ? 'border-yellow-500 bg-yellow-500/20' : 'border-gray-700 bg-gray-800'
                }`}>
                  <div className="text-2xl mb-2">😐</div>
                  <span className="text-sm">Neutral</span>
                </div>
                <div className={`p-4 rounded-lg border-2 text-center ${
                  formData.feeling > 66 ? 'border-green-500 bg-green-500/20' : 'border-gray-700 bg-gray-800'
                }`}>
                  <div className="text-2xl mb-2">😎</div>
                  <span className="text-sm">Confiado</span>
                </div>
              </div>

              {/* Public/Private Toggle */}
              <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${formData.is_public ? 'bg-green-500/20' : 'bg-gray-700'}`}>
                      {formData.is_public ? (
                        <Globe className="w-5 h-5 text-green-400" />
                      ) : (
                        <Lock className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-white font-semibold">
                        {formData.is_public ? 'Trade Público' : 'Trade Privado'}
                      </h3>
                      <p className="text-sm text-gray-400">
                        {formData.is_public 
                          ? 'Otros usuarios podrán ver este trade en el feed'
                          : 'Solo tú podrás ver este trade'
                        }
                      </p>
                    </div>
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => updateFormData('is_public', !formData.is_public)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      formData.is_public ? 'bg-green-500' : 'bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        formData.is_public ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                
                <div className="text-xs text-gray-500">
                  {formData.is_public ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      <span>Los trades públicos pueden recibir likes y comentarios de otros traders</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                      <span>Los trades privados solo son visibles para ti</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Layout>
      <div className="pb-20 md:pb-8">
        <div className="max-w-4xl mx-auto px-4 py-6">
          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold text-white">Trade Journal</h1>
              <span className="text-sm text-gray-400">
                Paso {currentStep} de {STEPS.length}
              </span>
            </div>
            
            <div className="relative">
              <div className="flex items-center justify-between">
                {STEPS.map((step, index) => (
                  <div key={step.id} className="flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                      currentStep > step.id
                        ? 'bg-green-500 border-green-500 text-white'
                        : currentStep === step.id
                        ? 'bg-blue-500 border-blue-500 text-white'
                        : 'bg-gray-800 border-gray-700 text-gray-400'
                    }`}>
                      {currentStep > step.id ? (
                        <Check className="w-5 h-5" />
                      ) : (
                        <step.icon className="w-5 h-5" />
                      )}
                    </div>
                    <span className={`text-xs mt-2 text-center ${
                      currentStep >= step.id ? 'text-white' : 'text-gray-400'
                    }`}>
                      {step.title}
                    </span>
                  </div>
                ))}
              </div>
              
              {/* Progress Line */}
              <div className="absolute top-5 left-5 right-5 h-0.5 bg-gray-700 -z-10">
                <div 
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Step Content */}
          <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-8 border border-gray-700/50 mb-8">
            {renderStep()}
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between">
            <button
              onClick={prevStep}
              disabled={currentStep === 1}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
                currentStep === 1
                  ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                  : 'bg-gray-700 text-white hover:bg-gray-600'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
              Anterior
            </button>

            {currentStep < STEPS.length ? (
              <button
                onClick={nextStep}
                disabled={!canProceed()}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
                  canProceed()
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                }`}
              >
                Siguiente
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || isGeneratingAdvice}
                className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <LoadingSpinner size={16} />
                    Guardando...
                  </>
                ) : isGeneratingAdvice ? (
                  <>
                    <LoadingSpinner size={16} />
                    Generando consejo...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Guardar Trade
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* AI Advice Modal */}
      {showAIModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl border border-gray-700 max-w-md w-full mx-4 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-sm">AI</span>
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">TradeTrackrAI</h3>
                    <p className="text-blue-100 text-sm">Tu asistente de trading inteligente</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAIModal(false)}
                  className="text-white/80 hover:text-white p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="mb-4">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-sm text-gray-400">Consejo personalizado</span>
                </div>
              </div>

              <div className="bg-gray-800/50 rounded-lg p-4 border-l-4 border-blue-500 mb-6">
                <p className="text-gray-300 text-sm leading-relaxed">
                  {generatedAdvice}
                </p>
              </div>

              <div className="text-xs text-gray-500 mb-4">
                Hace 1 día
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <span className="text-xs text-gray-400">Powered by</span>
                  <span className="text-blue-400 font-semibold text-sm">TradeTrackrAI</span>
                  <span className="text-xs text-gray-400">•</span>
                  <span className="text-xs text-gray-400">Análisis inteligente</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-800/50 px-6 py-4 border-t border-gray-700">
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowAIModal(false)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Entendido
                </button>
                <button
                  onClick={() => {
                    setShowAIModal(false);
                    // You could navigate to profile or trades page here
                  }}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Ver Perfil
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Styles for Slider */}
      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          background: #3b82f6;
          border-radius: 50%;
          cursor: pointer;
        }
        
        .slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          background: #3b82f6;
          border-radius: 50%;
          cursor: pointer;
          border: none;
        }
      `}</style>
    </Layout>
  );
}