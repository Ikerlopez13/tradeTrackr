// Utilidades para cálculos de P&L automáticos

export interface PnLCalculation {
  pnl_percentage: number;
  pnl_money: number;
  pnl_pips?: number;
}

/**
 * Calcula P&L en porcentaje basado en dinero y balance de cuenta
 */
export function calculatePercentageFromMoney(pnl_money: number, account_balance: number): number {
  if (account_balance <= 0) return 0;
  return (pnl_money / account_balance) * 100;
}

/**
 * Calcula P&L en dinero basado en porcentaje y balance de cuenta  
 */
export function calculateMoneyFromPercentage(pnl_percentage: number, account_balance: number): number {
  return (account_balance * pnl_percentage) / 100;
}

/**
 * Calcula P&L completo basado en el valor que se proporcione
 */
export function calculateCompletePnL(
  pnl_money?: number | null,
  pnl_percentage?: number | null, 
  account_balance: number = 1000
): PnLCalculation {
  
  // Si se proporciona dinero, calcular porcentaje
  if (pnl_money !== null && pnl_money !== undefined && (pnl_percentage === null || pnl_percentage === undefined)) {
    const calculated_percentage = calculatePercentageFromMoney(pnl_money, account_balance);
    return {
      pnl_money: pnl_money,
      pnl_percentage: Math.round(calculated_percentage * 100) / 100 // Redondear a 2 decimales
    };
  }
  
  // Si se proporciona porcentaje, calcular dinero  
  if (pnl_percentage !== null && pnl_percentage !== undefined && (pnl_money === null || pnl_money === undefined)) {
    const calculated_money = calculateMoneyFromPercentage(pnl_percentage, account_balance);
    return {
      pnl_percentage: pnl_percentage,
      pnl_money: Math.round(calculated_money * 100) / 100 // Redondear a 2 decimales
    };
  }
  
  // Si se proporcionan ambos, usar los valores existentes
  if (pnl_money !== null && pnl_percentage !== null && pnl_money !== undefined && pnl_percentage !== undefined) {
    return {
      pnl_money: pnl_money,
      pnl_percentage: pnl_percentage
    };
  }
  
  // Si no se proporciona nada, devolver ceros
  return {
    pnl_money: 0,
    pnl_percentage: 0
  };
}

/**
 * Valida que los valores de P&L sean consistentes entre sí
 */
export function validatePnLConsistency(
  pnl_money: number, 
  pnl_percentage: number, 
  account_balance: number,
  tolerance: number = 0.01 // 1% de tolerancia
): boolean {
  const expected_percentage = calculatePercentageFromMoney(pnl_money, account_balance);
  const percentage_diff = Math.abs(expected_percentage - pnl_percentage);
  return percentage_diff <= tolerance;
} 